"use strict";

const Cookies = require('cookies');
const {Session} = require('./Session');
const uuidv4 = require('uuid/v4');
const log = require('pino')();
const ejs = require('ejs');
const path = require('path');

class WebContext {
	constructor(app, request, response) {
		this.app = app;
		this.request = request;
		this.response = response;
		this.cookies = new Cookies(request, response);

		this._sessionName = app.getConfig()['session.name'];
		this._cookieDomain = app.getConfig()['cookie.domain'];
		this._sessionExpire = parseInt(app.getConfig()['session.expire.seconds']) || 3600;
		this._sessionEnable = app.getConfig()['session.enable'];

		this.session = new Session(app);
	}

	async newSession(){
		if(!this._sessionEnable){
			return;
		}
		await this.session.destroy();
		this.session.setSessionId(uuidv4());
		this.cookies.set(this._sessionName, this.session.getSessionId(), {
			domain: this._cookieDomain
		})
	}

	async loadSession() {
		if(!this._sessionEnable){
			return;
		}
		let sessionId = this.cookies.get(this._sessionName);
		if(!sessionId){
			await this.newSession();
		}else{
			this.session.setSessionId(sessionId);
			await this.session.load();
		}
	}

	async flushSession() {
		await this.session.save();
	}

	async render(filename, data) {
		let tplbase = 'templates';
		let options = {
			cache: true,
			client: false,
			async: true,
			root: tplbase
		}
		if(this.app.getEnv() == this.app.DEVELOPMENT) {
			options.cache = false;
		}
		let fullname = path.join(tplbase, `${filename}.ejs`)
		return new Promise((resolve, reject) => {
			ejs.renderFile(fullname, data, options, function(err, str){
				if(err) {
					let func = {func: "pine.WebContext.render"}
					log.error(func, "renderFile error: %s", err);
					resolve('');
				}
				resolve(str);
			});
		});
	}

	exit() {
		throw new WebContextExitError();
	}
}

class WebContextExitError extends Error {}

exports.WebContext = WebContext;
exports.WebContextExitError = WebContextExitError;