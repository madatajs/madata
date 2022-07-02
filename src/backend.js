import hooks from './hooks.js';


/**
 * Base class for all backends
 */
export default class Backend extends EventTarget {
	constructor (url, o = {}) {
		super();

		// Permissions of this particular backend.
		this.permissions = {};

		this.update(url, o);
	}

	update (url, o = {}) {
		this.source = url;

		// Backends that are not URL-based should just ignore this
		this.url = new URL(this.source, o.urlBase);

		this.options = o;

		if (this.constructor.key ?? o.key) {
			this.key = o.key ?? this.constructor.key;
		}
	}

	async parse (data) {
		return this.options.parse? this.options.parse(data) : JSON.parse(data);
	}

	async stringify (data) {
		return this.options.stringify? this.options.stringify(data) : JSON.stringify(data);
	}

	updatePermissions(o) {
		let changed = [];

		for (let permission in o) {
			let previousValue = this.permissions[permission];
			this.permissions[permission] = o[permission];

			if (previousValue !== o[permission]) {
				changed.push(permission);
			}
		}

		if (changed) {
			this.dispatchEvent(new CustomEvent("mv-permissionschange", {
				detail: changed
			}));
		}
	}

	async get (url = new URL(this.url)) {
		if (url.protocol != "data:" && this.constructor.useCache !== false) {
			url.searchParams.set("timestamp", Date.now()); // ensure fresh copy
		}

		try {
			let response = await fetch(url.href);
			return response.ok? response.text() : Promise.reject(response);
		}
		catch (e) {
			return null;
		}
	}

	async load () {
		await this.ready;
		let response = await this.get();

		if (typeof response != "string") {
			// Backend did the parsing, we're done here
			return response;
		}

		response = response.replace(/^\ufeff/, ""); // Remove Unicode BOM

		let json = this.parse(response);

		return json;
	}

	async store (data, {path} = {}) {
		await this.ready;

		let serialized = typeof data === "string"? data : await this.stringify(data);
		await this.put(serialized, path);

		return {data, serialized};
	}

	// To be be overriden by subclasses
	ready = Promise.resolve()

	put () {
		return Promise.reject();
	}

	toString () {
		return `${this.id} (${this.source})`;
	}

	equals (backend) {
		return backend === this || (backend && this.id == backend.id && this.source == backend.source);
	}

	// Return the appropriate backend(s) for this url
	static create (url, o = {}) {
		let Class;

		if (o.type) {
			// Using get() for case-insensitive property lookup
			Class = Backend[o.type];
		}

		if (url && !Class) {
			Class = Backend.types.find(c => c.test(url, o)) || Backend.Remote;
		}

		// Can we re-use the existing object perhaps?
		if (Class && o.existing?.constructor === Class && o.existing.constructor.prototype.hasOwnProperty("update")) {
			o.existing.update(url, o);
			return existing;
		}

		return Class? new Class(url, o) : null;
	}

	static types = []

	static register (Class) {
		Backend[Class.name] = Class;
		Backend.types.push(Class);
		return Class;
	}

	static hooks = hooks
};