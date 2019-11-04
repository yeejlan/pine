"use strict";

const redis = require("redis");
const {Mysql} = require("./Mysql");
const {promisify} = require('util');
const {Config} = require('./Config');
const {SessionStorageRedis} = require('./SessionStorageRedis');
const log = require('pino')()

class ResourceLoader {
	constructor(app) {
		this._app = app;
		this._sessionEnable = this._app.getConfig()['session.enable'];
		this._envString = this._app.getEnvString();
	}

	async autoload() {
		await this._loadDatabase();
		await this._loadRedis();
		await this._loadSessionStorage();
	}

	async _loadDatabase(){
		let configFile = `config/${this._envString}/db.ini`;
		let config = null;
		try{
			config = new Config(configFile).parse();
		}catch(e){
			let func = {func: "pine.ResourceLoader._loadDatabase"}
			log.warn(func, "Config parse error: %s", e);
			return
		}
		let configMatcher = /^mysql\.([_a-zA-Z0-9]+)\.url/
		for(let key in config){
			if(configMatcher.test(key)){
				let redisName = key.substring(0, key.length - ".url".length);
				let autoloadKey = `${redisName}.autoload`;
				if(config[autoloadKey]){
					await this.loadDatabase(config, redisName);
				}
			}
		}
	}

	async loadDatabase(config, configName) {
		let url = config[`${configName}.url`];
		let client = new Mysql(url);
		this._app.set(configName, client);
		this._app.addShutdownHook(() => {client.close()});
	}

	async loadRedis(config, configName) {
		let opt = {
			host: config[`${configName}.host`],
			port: config[`${configName}.port`]
		};
		let client = redis.createClient(opt);
		let selectAsync = promisify(client.select).bind(client);
		let database = config[`${configName}.database`] || 0
		await selectAsync(database);
		this._app.set(configName, client);
		this._app.addShutdownHook(() => {client.quit()});
	}

	async _loadRedis(){
		let configFile = `config/${this._envString}/redis.ini`;
		let config = null;
		try{
			config = new Config(configFile).parse();
		}catch(e){
			let func = {func: "pine.ResourceLoader._loadRedis"}
			log.warn(func, "Config parse error: %s", e);			
			return
		}
		let configMatcher = /^redis\.([_a-zA-Z0-9]+)\.host/
		for(let key in config){
			if(configMatcher.test(key)){
				let redisName = key.substring(0, key.length - ".host".length);
				let autoloadKey = `${redisName}.autoload`;
				if(config[autoloadKey]){
					await this.loadRedis(config, redisName);
				}
			}
		}
	}

	async _loadSessionStorage() {
		let configName = "session.storage";
		let storageName = this._app.getConfig()[configName];

		if(!this._sessionEnable) {
			log.info("Session is NOT enabled.");
			return;
		}
		if(!storageName){
			log.warn(`App config["${configName}"] not found, fallback to "redis"`);
			storageName = "redis";
		}
		let storageSupported = ['redis'];
		if(!(storageSupported.indexOf(storageName) > -1)) {
			log.warn(`Session storage not supported: "${storageName}", session disabled`);
			return;
		}
		switch(storageName) {
			case "redis":
				this._app.set("session.storage", new SessionStorageRedis(this._app));
				break;
		}
	}
}

exports.ResourceLoader = ResourceLoader;