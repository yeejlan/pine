"use strict";

const http = require('http');
const log = require('pino')()

class Server {
	constructor(app, router) {
		this.router = router;
		this.app = app;
	}

	serve(port) {
		let router = this.router;
		port = port || 8080;
		let server = http.createServer(function(request, response) {
			router.dispatch(request, response);
		});

		let app = this.app;
		let shutdown = function(force) {
			server.close(function onServerClosed (err){
				if (err) {
					let func = {func: "pine.Server.serve"};
					log.error(func, "server.close error: %s", err);
					process.exit(1);
				}else {
					if(force) {
						process.exit(0);
					}
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

		process.on('SIGINT', function onSigterm () {
			log.info('Got SIGINT, server force shutting down');
			shutdown(true);
		});

		server.listen(port);
		if(server.listening){
			log.info("Server listen on %s", port);
		}
	}
}

exports.Server = Server;