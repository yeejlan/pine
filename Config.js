"use strict";

const fs = require('fs');
const ini = require('ini');
const log = require('pino')()

class Config {
	constructor(configFile) {
		this.configFile = configFile;
	}

	parse() {
		try{
			let config = ini.parse(fs.readFileSync(this.configFile, 'utf8'));
			return config;
		}catch(e){
			let func = {func: "pine.Config.parse"}
			log.error(func, "Config parse error: %s", e);
			return {};
		}
	}
}

exports.Config = Config;