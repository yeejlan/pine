"use strict";

const Cookies = require('cookies')
const {Session} = require('./Session')
const uuidv4 = require('uuid/v4');

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
}

exports.WebContext = WebContext;