"use strict";

const log = require('pino')()
const {promisify} = require('util');

class Cache {
	constructor(app) {
		this._app = app;
		this._redisProvider = app.getConfig()['cache.storage.provider'];
		this._cacheEnable = app.getConfig()['cache.enable'] == "true";
		let client = app.get(this._redisProvider);
		this._redis = client;
		if(!this._redis) {
			let func = {func: 'pine.Cache.constructor'};
			log.warn(func, "Can not found redis provider: %s, cache disabled.", this._redisProvider);
			this._cacheEnable = false;
		}
		this._cachePrefix = app.getConfig()['cache.prefix'];
		this._cacheExpireSeconds = parseInt(app.getConfig()['cache.expire.seconds']) || 3600;

		this.getAsync = promisify(client.get).bind(client);
		this.delAsync = promisify(client.del).bind(client);
	}

	client() {
		return this._redis;
	}

	async set(key, value, expireSeconds) {
		expireSeconds = expireSeconds || this._cacheExpireSeconds;
		return new Promise((resolve, reject) => {
			this._redis.set(this._cachePrefix + key, value, 'EX', expireSeconds, (err, replies) => {
				resolve(replies);
			});
		});
	}

	async setObj(key, value, expireSeconds) {
		let obj = JSON.stringify(value);
		return await this.set(key, value, expireSeconds);
	}

	async get(key) {
		return await this.getAsync(this._cachePrefix + key);
	}

	async getObj(key) {
		let value = await this.get(key);
		try{
			return JSON.parse(value);
		}catch(e){
			return null;
		}
	}

	async getInt(key) {
		let value = await this.get(key);
		return parseInt(value) || 0;
	}

	async delete(key) {
		return await this.delAsync(this._cachePrefix + key);
	}
}

exports.Cache = Cache;