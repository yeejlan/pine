"use strict";

const log = require('pino')()
const {promisify} = require('util');

class SessionStorageRedis {
	constructor(app) {
		this._app = app;
		this._sessionExpire = parseInt(app.getConfig()['session.expire.seconds']) || 3600;
		this._storageProvider = app.getConfig()['session.storage.provider'];

		let client = app.get(this._storageProvider);
		this._redis = client;
		this._storageEnable = true;
		if(!this._redis) {
			let func = {func: 'pine.SessionStorageRedis.constructor'};
			log.warn(func, "Can not found session storage provider: %s.", this._storageProvider);
			this._storageEnable = false;
			return;
		}

		this.getAsync = promisify(client.get).bind(client);	
	}

	async load(sessionId) {
		if(!this._storageEnable){
			return '';
		}
		return await this.getAsync(sessionId);
	}

	async save(sessionId, data) {
		if(!this._storageEnable){
			return '';
		}
		let expireSeconds = expireSeconds || this._sessionExpire;
		return new Promise((resolve, reject) => {
			this._redis.set(sessionId, data, 'EX', expireSeconds, (err, replies) => {
				resolve(replies);
			});
		});
	}
}

exports.SessionStorageRedis = SessionStorageRedis;