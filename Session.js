"use strict";

class Session {
	constructor(app) {
		this._app = app;
		this._sessionEnable = app.getConfig()['session.enable'];
		this._map = {};
		this._changed = false;
		this._sessionId = null;
		this._sessionStorage = app.get("session.storage");
	}

	setSessionId(sessionId) {
		this._sessionId = sessionId;
	}

	getSessionId() {
		return this._sessionId;
	}

	set(key, value) {
		this.changed();
		this._map[key] = value;
	}

	get(key) {
		return this._map[key];
	}

	delete(key) {
		this.changed();
		delete this._map[key];
	}

	touch() {
		this.changed();
	}

	async destroy() {
		this.changed();
		this._map = {};
		await this.save();
	}

	async load() {
		if(!this._sessionId){
			return;
		}

		if(this._sessionEnable && this._sessionStorage) {
			let valueStr = await this._sessionStorage.load(this._sessionId);
			try{
				this._map = JSON.parse(valueStr);
			}catch(e){
				return;
			}
		}
		return;
	}

	async save() {
		if(!this._changed) {
			return;
		}

		this._changed = false;
		if(!this._sessionId) {
			return;
		}

		if(this._sessionEnable && this._sessionStorage) {
			let valueStr =  JSON.stringify(this._map);
			await this._sessionStorage.save(this._sessionId, valueStr);
		}
	}

	changed() {
		this._changed = true;
	}

	getStorage() {
		return this._map;
	}
}

exports.Session = Session;