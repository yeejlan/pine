"use strict";

const redis = require("redis");
const {promisify} = require('util');
const {Config} = require('./Config');
const log = require('pino')()

class ResourceLoader {
	constructor(app) {
		this._app = app;
		this._sessionEnabled = this._app.getConfig['session.enable'];
		this._envString = this._app.getEnvString();
	}

	async autoload() {
		await this._loadRedis();
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
}

exports.ResourceLoader = ResourceLoader;