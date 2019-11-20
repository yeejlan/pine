"use strict";

const http = require('http');
const log = require('pino')()

class Server {
	constructor(router) {
		this.router = router;
		this.app = router.getApp();
	}

	serve(port) {
		let router = this.router;
		port = port || 8080;
		let server = http.createServer(function(request, response) {
			router.dispatch(request, response);
		});

		let app = this.app;
		let shutdown = function() {
			//force shutdown
			let shutdownTimer = setTimeout(function() {
				log.warn("server force closed after timeout");
				process.exit(0);
			}, 15000);
			server.close(function onServerClosed (err){
				if (err) {
					let func = {func: "pine.Server.serve"};
					log.error(func, "server.close error: %s", err);
					process.exit(0);
				}else {
					app.shutdown();
					clearTimeout(shutdownTimer);
					process.exit(0);
				}
			});
		}
		process.on('SIGTERM', function onSigterm () {
			log.info('Got SIGTERM, server shutting down');
			shutdown();
		});

		process.on('SIGINT', function onSigterm () {
			if(app.getEnv() == app.DEVELOPMENT) {
				process.exit(0);
			}
			log.info('Got SIGINT, server shutting down');
			shutdown();
		});

		server.listen(port);
		server.on('error', (err) => {
			let func = {func: "pine.Server.serve"};
			log.error(func, "server.listen error: %s", err);
			process.exit(1);
		});
		if(server.listening){
			log.info("Server listen on %s", port);
		}
	}
}

exports.Server = Server;