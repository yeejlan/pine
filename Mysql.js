"use strict";

const mysql = require('mysql2');
const namedRegex = /:([_a-zA-Z0-9]+)/g;
const log = require('pino')()

class Mysql {
	constructor(url) {
		this.pool = mysql.createPool(url);
	}

	async select(namedSql, namedParams) {
		let result = await this.query(namedSql, namedParams);
		return result;
	}

	async insert(namedSql, namedParams, returnInsertId) {
		let result = await this.query(namedSql, namedParams);
		if(returnInsertId) {
			if(result){
				return result.insertId;
			}else{
				return 0;
			}
		}
		return result;
	}

	async update(namedSql, namedParams) {
		let result = await this.query(namedSql, namedParams);
		if(!result){
			return result;
		}
		return result.affectedRows;
	}

	async query(namedSql, namedParams) {
		if(!this.pool) {
			return false;
		}
		let[sql, params] = this.createQuery(namedSql, namedParams);
		return new Promise((resolve, reject) => {
			this.pool.execute(sql, params, function(err, results, fields){
				if(err) {
					let func = {func: 'pine.Mysql.query'};
					log.error(func, "query error: %s", err);
					resolve(false);
				}else{
					resolve(results);
				}
			})
		});
	}

	createQuery(namedSql, namedParams) {
		let bindList = [];
		let match = null;
		while(match = namedRegex.exec(namedSql)){
			let bindName = match[1];
			let bindValue = namedParams[bindName];
			bindList.push(bindValue);
		}
		let sql = namedSql.replace(namedRegex, '?');
		let ret = [sql, bindList];
		return ret;
	}

	close() {
		if(!this.pool) {
			return;
		}
		this.pool.end()
	}
}

exports.Mysql = Mysql;