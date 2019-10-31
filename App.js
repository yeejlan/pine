"use strict";

const {Config} = require('./Config');
const log = require('pino')();
const fs = require('fs');

class App {
	constructor() {
		this.PRODUCTION = 10;
		this.STAGING = 20;
		this.TESTING = 30;
		this.DEVELOPMENT = 40;

		this.envStrMapping = {};
		this.envStrMapping[this.PRODUCTION] = 'production';
		this.envStrMapping[this.STAGING] = 'staging';
		this.envStrMapping[this.TESTING] = 'testing';
		this.envStrMapping[this.DEVELOPMENT] = 'development';

		this.strEnvMapping = {};
		for(let key in this.envStrMapping){
			this.strEnvMapping[this.envStrMapping[key]] = key;
		}

		this._isInit = false;
		this._env = this.PRODUCTION;
		this._envString = this.envStrMapping[this._env] || "production";
		this._configFile = '';
		this._config = null;
		this._appName = '';
	}

	init(envStr, appName) {
		this._appName = appName;
		this._env = this.strEnvMapping[envStr] || this.PRODUCTION;
		this._envString = this.envStrMapping[this._env];
		this._configFile = `config/${this._envString}/${appName}.ini`;
		this._config = new Config(this._configFile).parse();
		//set timezone
		if(!this._config.timezone){
			log.error('Please set "timezone" in config file');
			process.exit(1);
		}
		process.env.TZ = this._config.timezone;

		log.info(`App[${appName}] starting with env=${this._envString}, config=${this._configFile}, working_dir = ` + process.cwd());
		this._isInit = true;
	}

	getEnv() {
		this._checkInit();
		return this._env;

	}

	getEnvString() {
		this._checkInit();
		return this._envString;
	}

	getName() {
		this._checkInit();
		return this._appName;
	}

	getConfig() {
		this._checkInit();
		return this._config;
	}

	_checkInit() {
		if(!this._isInit) {
			log.error(`App init error, env: ${this._envString}, config: ${this._configFile}`);
			process.exit(1);
		}
	}
}

exports.App = App;