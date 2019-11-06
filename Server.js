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
			server.close(function onServerClosed (err){
				if (err) {
					let func = {func: "pine.Server.serve"};
					log.error(func, "server.close error: %s", err);
					process.exit(0);
				}else {
					//force shutdown
					setTimeout(function() {
						log.warn("server force closed after timeout");
						process.exit(0);
					}, 15000);
					app.shutdown();
				}
			});
		}
		process.on('SIGTERM', function onSigterm () {
			log.info('Got SIGTERM, server shutting down');
			shutdown();
		});

		server.listen(port);
		server.on('error', (err) => {
			let func = {func: "pine.Server.serve"};
			log.error(func, "server.listen error: %s", err);
			process.exit(0);
		});
		if(server.listening){
			log.info("Server listen on %s", port);
		}
	}
}

exports.Server = Server;