/**
 * Base class for all backends
 * @claas Backend
 * @extends EventTarget
 */
import hooks from './hooks.js';
import {toArray} from './util.js';

/**
 * @param {string} url - URL string describing the data location
 * @param {object} o - Options
 */
export default class Backend extends EventTarget {
	constructor (url, o = {}) {
		super();

		// Permissions of this particular backend.
		this.permissions = {};

		this.update(url, o);
	}

	/**
	 * Update an existing backend instance with new parameters
	 * @param {string} url - Same as constructor
	 * @param {object} o - Same as constructor
	 */
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

	/**
	 * Low-level method to fetch data from the backend. Subclasses should override this method.
	 * Clients should not call this method directly, but use `load()` instead.
	 * @param {Object} file - file to fetch, if different from that provided in the constructor
	 * @returns {string} - Data from the backend as a string, `null` if not found
	 */
	async get (file = this.file) {
		let url = new URL(file.url);
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

	#getFile (ref) {
		if (typeof ref === "string") {
			// ref is a URL
			if (/^\w+:/.test(ref)) {
				// Absolute URL
				return this.constructor.parseURL(ref);
			}

			// Relative path
			return Object.assign({}, this.file, {path: ref});
		}

		// Either file object, or empty value
		return ref ?? this.file;
	}

	/**
	 * Higher-level method for reading data from the backend.
	 * Subclasses should usually NOT override this method.
	 * @param {string} url - URL to fetch, if different from that provided in the constructor
	 * @param  {...any} args
	 * @returns {object} - Data from the backend as a JSON object, `null` if not found
	 */
	async load (url, ...args) {
		await this.ready;

		let file = this.#getFile(url);

		let response = await this.get(file, ...args);

		if (typeof response !== "string") {
			// Backend did the parsing, we're done here
			return response;
		}

		response = response.replace(/^\ufeff/, ""); // Remove Unicode BOM

		let json = this.parse(response);

		return json;
	}

	/**
	 * Higher-level method for writing data to the backend.
	 * Subclasses should usually NOT override this method.
	 * @param {object} data - Data to write to the backend
	 * @param {object} [o] - Options object
	 * @returns {object} - If successsful, info about the file
	 */
	async store (data, o = {}) {
		await this.ready;

		if (typeof o === "string") {
			o = {url: o};
		}

		let {file, url, ...options} = o;

		file = this.#getFile(file ?? url);

		let serialized = typeof data === "string"? data : await this.stringify(data);

		return this.put(serialized, {file, ...options});
	}

	async remove (file = this.file) {
		await this.ready;

		if (!this.delete) {
			throw new Error("This backend does not support deleting files");
		}

		file = this.#getFile(file);

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

	/**
	 * Return the appropriate backend(s) for this url
	 * @param {string} url - URL describing the storage location
	 * @param {object} [o] - Options object to be passed to the backend
	 * @param {Backend | Array<Backend>} [o.existing] - Existing backend object(s) to re-use if possible
	 */
	static from (url, o = {}) {
		let Class;

		if (o.type) {
			Class = Backend[o.type];
		}

		if (url && !Class) {
			// Find a suitable backend
			// If none found, fall back to basic read-only URL loading
			Class = Backend.find(url, o) ?? Backend.Remote;
		}

		// Can we re-use the existing object perhaps?
		if (o.existing) {
			let existing = toArray(o.existing)
			               .find(backend => backend.constructor === Class && backend.constructor.prototype.hasOwnProperty("update"));
			if (existing) {
				existing.update(url, o);
				return existing;
			}
		}

		return Class? new Class(url, o) : null;
	}

	static find (url, o) {
		if (url) {
			for (let backend of Backend.all) {
				// Check first if backend is a descendant class of this
				// This allows calling create on child classes to narrow the scope of the search
				// And then if the URL is one of the URLs handlded by it
				if (backend.prototype instanceof this && backend.test(url, o)) {
					return backend;
				}
			}
		}

		return null;
	}

	static all = []

	static register (Class) {
		Backend[Class.name] = Class;
		Backend.all.push(Class);
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

	/**
	 * Auth Provider to use
	 */
	static authProvider = "https://auth.madata.dev"

	/**
	 * services.json from the auth provider will be cached here.
	 * You could also set this manually to avoid the network request.
	 * @member {Promise<Object>}
	 */
	static get authProviderServices () {
		// If the getter is running, we don't have this info, fetch from the auth provider
		// FIXME what if the request fails or it's not valid JSON?
		// FIXME if authProvider changes, this doesn't get updated
		// We use `Backend` instead of `this` because `this` will point to the current class,
		// and we want to overwrite this on the parent class
		delete Backend.authProviderServices;
		return Backend.authProviderServices = fetch(new URL("/services.json", this.authProvider)).then(r => r.json());
	}
};