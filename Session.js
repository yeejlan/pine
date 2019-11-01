"use strict";

class Session {
	constructor(app) {
		this._app = app;
		this._sessionEnable = app.getConfig()['session.enable'];
		this._map = {};
		this._changed = false;
		this._sessionid = null;
		this._sessionStorage = null;
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

	destroy() {
		this.changed();
		this._map = {};
		this.save()
	}

	load() {
		if(!this._sessionid){
			return;
		}

		if(sessionEnable && this._sessionStorage) {
			//
		}
	}

	save() {
		if(!this._changed) {
			return;
		}

		this._changed = false;
		if(!this._sessionid) {
			return;
		}
	}

	changed() {
		this._changed = true;
	}

	getMap() {
		return this._map;
	}
}

exports.Session = Session;