"use strict";

const http = require('http');
const log = require('pino')()

class Server {
	constructor(router) {
		this.router = router
	}

	serve(port) {
		let router = this.router;
		port = port || 8080;
		let server = http.createServer(function(request, response) {
			router.dispatch(request, response);
		});
		server.listen(port);
		if(server.listening){
			log.info("Server listen on %s", port);
		}
	}
}

exports.Server = Server;