"use strict";

class Registry {
	constructor() {
		this.storage = {};
	}

	get(key) {
		return this.storage[key];
	}

	set(key, value) {
		this.storage[key] = value;
	}

	delete(key) {
		delete this.storage[key];
	}

	getStorage() {
		return this.storage;
	}
}

exports.Registry = Registry;