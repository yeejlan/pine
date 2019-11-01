"use strict";

const Cookies = require('cookies')

class WebContext {
	constructor(app, request, response) {
		this.app = app;
		this.request = request;
		this.response = response;
		this.cookie = new Cookies(request, response);

		this._sessionName = app.getConfig()['session.name'];
		this._cookieDomain = app.getConfig()['cookie.domain'];
		this._sessionExpire = parseInt(app.getConfig()['session.expire.seconds']) || 3600;
		this._sessionEnable = app.getConfig()['session.enable'] == "true";
	}
}

exports.WebContext = WebContext;