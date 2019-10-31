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

	async parseAsync() {
		return new Promise((resolve, reject) => {
			fs.readFile(this.configFile, 'utf8', (err, data) => {
				if(err) {
					let func = {func: "pine.Config.parseAsync"}
					log.error(func, "Config parse error: %s", err);
					resolve({});
				}else{
					resolve(ini.parse(data));
				}
			})
		})
	}
}

exports.Config = Config;