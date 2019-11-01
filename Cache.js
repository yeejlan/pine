"use strict";

const log = require('pino')()
const {promisify} = require('util');

class Cache {
	constructor(app) {
		this._app = app;
		this._redisProvider = app.getConfig()['cache.storage.provider'];
		this._cacheEnable = app.getConfig()['cache.enable'];
		let client = app.get(this._redisProvider);
		this._redis = client;
		if(!this._redis) {
			let func = {func: 'pine.Cache.constructor'};
			log.warn(func, "Can not found redis provider: %s, cache disabled.", this._redisProvider);
			this._cacheEnable = false;
			return;
		}
		this._cachePrefix = app.getConfig()['cache.prefix'];
		this._cacheExpireSeconds = parseInt(app.getConfig()['cache.expire.seconds']) || 3600;

		this.getAsync = promisify(client.get).bind(client);
		this.delAsync = promisify(client.del).bind(client);
	}

	client() {
		return this._redis;
	}

	async setString(key, value, expireSeconds) {
		expireSeconds = expireSeconds || this._cacheExpireSeconds;
		return new Promise((resolve, reject) => {
			this._redis.set(this._cachePrefix + key, value, 'EX', expireSeconds, (err, replies) => {
				resolve(replies);
			});
		});
	}

	async set(key, value, expireSeconds) {
		let objStr = JSON.stringify(value);
		return await this.setString(key, objStr, expireSeconds);
	}

	async getString(key) {
		if(!this._cacheEnable) {
			return '';
		}
		return await this.getAsync(this._cachePrefix + key);
	}

	async get(key) {
		let value = await this.getString(key);
		try{
			return JSON.parse(value);
		}catch(e){
			return null;
		}
	}

	async delete(key) {
		return await this.delAsync(this._cachePrefix + key);
	}
}

exports.Cache = Cache;