"use strict";

const url = require('url');
const mime = require('mime');
const querystring = require('querystring');
const multiparty = require('multiparty');
const path = require('path');
const fs = require('fs');
const log = require('pino')()
const {WebContext, WebContextExitError} = require('./WebContext');

class Router {
	constructor(app) {
		this._routers = [];
		this._app = app;
	}

	getApp() {
		return this._app;
	}

	setController(controller) {
		this._controller = controller || {}
	}

	addRoute(regex, rewriteTo, paramMapping) {
		let rule = {
			regex: regex,
			rewriteTo: rewriteTo,
			paramMapping: paramMapping
		};
		this._routers.push(rule);
	}

	async dispatch(request, response) {
		let parsedUrl = url.parse(request.url, '');
		let params = querystring.parse(parsedUrl.query);
		let requestUri = parsedUrl.pathname;
		let uri = requestUri.replace(/^\//,'').replace(/\/$/,'');

		let routeMatched = false;
		let controller = "";
		let action = "";

		if(this._app.getEnv() == this._app.DEVELOPMENT) {
			let staticFileFound = await this._serveStaticFile(request, response);
			if(staticFileFound){
				return;
			}
		}

		//handle post form
		let post = await this.processPost(request, response);
		if(post === false) {
			return;
		}
		for(let key in post) {
			params[key] = post[key];
		}

		//handle multi part form
		let result = await this.processForm(request, response);
		if(result === false) {
			return;
		}
		let [files,fields] = result;
		for(let key in fields) {
			params[key] = fields[key];
		}

		//check rewrite rules
		for(let rewrite of this._routers){
			let matches = requestUri.match(rewrite.regex);
			if(!matches || matches.length < 1 ){
				continue;
			}
			//route matched
			let rewriteToArr = rewrite.rewriteTo.split('/');
			if(rewriteToArr.length == 2){
				controller = rewriteToArr[0];
				action = rewriteToArr[1];
			}
			//add params
			if(rewrite.paramMapping != null){
				for(let idx in rewrite.paramMapping){
					if(idx < matches.length){
						let key = rewrite.paramMapping[idx];
						let value = matches[idx];
						params[key] = value;
					}
				}
			}
			routeMatched = true;
			break;
		}

		//normal controller/action parse
		if(!routeMatched){
			let uriArr = uri.split('/');  //format: 'controller/action'
			if(uri == ''){
				controller = 'home';
				action = "index";
			}else if(uriArr.length == 1){
				controller = uriArr[0];
				action = "index";
			}else if(uriArr.length == 2){
				controller = uriArr[0];
				action = uriArr[1];
			}
		}

		let ctx = new WebContext(this._app, request, response);
		ctx.files = files;
		ctx.params = params;
		ctx.controller = controller;
		ctx.action = action;

		ctx.response.setHeader('Content-Type', 'text/html; charset=utf-8');
		this.callAction(ctx, controller, action);
	}

	capitalize(str) {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}

	async callAction(ctx, controller, action) {
		let controllerStr = this.capitalize(controller) + "Controller";
		let clz = this._controller[controllerStr];
		if(!clz) {
			this._pageNotFound(ctx);
			return;
		}
		let instance = new clz();
		let actionStr = action + "Action";
		let func = instance[actionStr];
		if(!func) {
			this._pageNotFound(ctx);
			return;
		}
		try{
			await ctx.loadSession();
			instance.ctx = ctx;
			let before = instance.before;
			if(before) {
				await instance.before();
			}
			let out = await instance[actionStr]();
			await ctx.session.save();
			this._end(ctx, out);
			return;
		}catch(e){
			if(e instanceof WebContextExitError) {
				this._end(ctx);
				return;
			}else{
				let func = {func: 'pine.Router.callAction'};
				log.error(func, "internal server error: %s", e.stack);
				this._internalServerError(ctx, e);
				return;
			}
		}
	}

	_end(ctx, data) {
		if(data) {
			if(typeof data == 'string' || data instanceof Buffer){
				ctx.response.end(data);
			}else{
				ctx.response.end(JSON.stringify(data));
			}
		}else{
			ctx.response.end();
		}
	}

	async _pageNotFound(ctx){
		ctx.response.statusCode = 404;

		let msg404 = "Page Not Found!";
		let controllerStr = "ErrorController"
		let clz = this._controller[controllerStr];
		if(!clz) {
			ctx.response.end(msg404);
			return
		}
		let instance = new clz();
		let actionStr = "page404Action";
		let func = instance[actionStr];
		if(!func) {
			ctx.response.end(msg404);
			return;
		}
		try{
			instance.ctx = ctx;
			let out = await instance[actionStr]();
			this._end(ctx, out);
			return;
		}catch(e){
			this._internalServerError(ctx, e)
		}finally {
			//delete uploaded files
			if(ctx.files) {
				let files = ctx.files;
				for (let key in files) {
					if (files.hasOwnProperty(key)){
						for(let file of files[key]){
							fs.unlink(file.path, function (err) {});
						}
					}
				}
			}
			//delete end
		}
	}

	async _internalServerError(ctx, err) {
		ctx.response.statusCode = 500;

		let body = '';

		let msg500 = "Internal Server Error!";
		let controllerStr = "ErrorController"
		let clz = this._controller[controllerStr];
		if(!clz) {
			body = msg500;
		}
		let instance = null;
		let actionStr = 'page500Action';
		if(!body){
			instance = new clz();
			let func = instance[actionStr];
			if(!func) {
				body = msg500;
			}
		}
		if(!body){
			try{
				instance.ctx = ctx;
				let out = await instance[actionStr]();
				this._end(ctx, out);
			}catch(e){
				ctx.response.end(msg500);
				return;
			}
		}

		if(ctx.app.getEnv() == ctx.app.DEVELOPMENT) {
			let ex = err || {};
			body += `<br />\n<pre>${ex.stack}</pre>`;
		}
		ctx.response.end(body);
	}

	async processForm(request, response){
		if(request.method == 'POST' && request.headers['content-type'] == 'multipart/form-data') {
			let form = new multiparty.Form();
			return new Promise((resolve, reject) => {
				form.parse(request, function(err, fields, files) {
					if(err) {
						response.writeHead(500, {'Content-Type': 'text/plain'});
						response.end('upload error');
						resolve(false);
					}else{
						resolve([fields, files]);
					}
				});
			});
		}
		return [{},{}];
	}

	async processPost(request, response) {
		if(request.method == 'POST' && request.headers['content-type'] == 'application/x-www-form-urlencoded') {
			return new Promise((resolve, reject) => {
				let queryData = "";
				request.on('data', function(data) {
					queryData += data;
					if(queryData.length > 1e6) {
						queryData = "";
						response.writeHead(413, {'Content-Type': 'text/plain'});
						response.end();
						request.connection.destroy();
						resolve(false);
					}
				});

				request.on('end', function() {
					let post = querystring.parse(queryData);
					resolve(post);
				});
			});
		}
		return {};
	}

	async _serveStaticFile(request, response) {
		let fileNotFound = false;

		let BASEPATH = "public"
		let parsedUrl = url.parse(request.url, '');
		let uri = parsedUrl.pathname;
		let ctype = mime.getType(uri);
		let fileLoc = path.join(BASEPATH, uri);

		return new Promise((resolve, reject) => {
			fs.readFile(fileLoc, function(err, data) {
				if (err) {
					resolve(fileNotFound);
				}else{
					response.statusCode = 200;
					response.setHeader('Content-Type', ctype);
					response.write(data);
					response.end();
					resolve(true);
				}
			});
		});
	}
}

exports.Router = Router;