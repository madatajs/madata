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
		this.file = this.constructor.parseURL(url);
		this.options = o;

		// Options object has higher priority than url
		for (let prop in this.file) {
			if (prop in o) {
				this.file[prop] = o[prop];
			}
		}
	}

	async parse (data) {
		return this.options.parse? this.options.parse(data) : JSON.parse(data);
	}

	async stringify (data) {
		return this.options.stringify? this.options.stringify(data) : JSON.stringify(data, null, "\t");
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

	async get (url = new URL(this.file.url)) {
		if (url.protocol != "data:" && this.constructor.useCache !== false) {
			url.searchParams.set("timestamp", Date.now()); // ensure fresh copy
		}

		try {
			let response = await fetch(url.href);

			if (response.ok) {
				return response.text();
			}
		}
		catch (e) {}

		return null;
	}

	async load (url, ...args) {
		await this.ready;

		let file;

		if (url) {
			if (/^\w+:/.test(url)) {
				// Absolute URL
				file = this.constructor.parseURL(url);
			}
			else {
				// Relative path
				file = Object.assign({}, this.file, {path: url});
			}
		}
		else {
			file = this.file;
		}

		let response = await this.get(file, ...args);

		if (typeof response != "string") {
			// Backend did the parsing, we're done here
			return response;
		}

		response = response.replace(/^\ufeff/, ""); // Remove Unicode BOM

		let json = this.parse(response);

		return json;
	}

	async store (data, o = {}) {
		await this.ready;

		if (typeof o === "string") {
			o = {url: o};
		}

		let {file, url, ...options} = o;

		if (url) {
			if (/^\w+:/.test(url)) {
				// Absolute URL
				file = this.constructor.parseURL(url);
			}
			else {
				// Relative path
				file = Object.assign({}, this.file, {path: url});
			}
		}
		else if (!file) {
			file = this.file;
		}

		let serialized = typeof data === "string"? data : await this.stringify(data);

		let fileInfo = await this.put(serialized, {file, ...options});

		// TODO add data and serialized onto fileInfo so we can just return a single value?

		return {data, serialized, fileInfo};
	}

	async remove (file = this.file) {
		await this.ready;

		if (typeof file === "string") {
			if (/^\w+:/.test(file)) {
				// Absolute URL
				file = this.constructor.parseURL(file);
			}
			else {
				// Relative path
				file = Object.assign({}, this.file, {path: file});
			}
		}
		else if (!file) {
			file = this.file;
		}

		return this.delete(file);
	}

	toString () {
		return `${this.constructor.name} (${this.source})`;
	}

	equals (backend) {
		return backend === this || (backend && this.constructor == backend.constructor && this.source == backend.source);
	}

	static parseURL(source) {
		let url = new URL(source, location);
		return {url};
	}

	// Return the appropriate backend(s) for this url
	static create (url, o = {}) {
		let Class;

		if (o.type) {
			Class = Backend[o.type];
		}

		if (url && !Class) {
			for (let backend of Backend.types) {
				if (backend.test(url, o)) {
					Class = backend;

					// TODO check if backend is a descendant class of this
					// This allows calling create on child classes to narrow the scope of the search

					break;
				}
			}

			if (!Class) {
				// No backend found, fall back to basic read-only URL loading
				Class = Backend.Remote
			}
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

	static phrase (id, ...args) {
		let ret = this.phrases?.[id];

		if (ret) {
			if (typeof ret === "function") {
				return ret(...args);
			}

			return ret;
		}

		// Not found, look in ancestors
		let parent = Object.getPrototypeOf(this);
		if (parent.phrase) {
			return parent.phrase(id, ...args);
		}

		// We're on the root class and still can't find it
		return id + " " + args.join(" ");
	}
};