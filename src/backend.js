/**
 * Base class for all backends
 * @class Backend
 * @extends EventTarget
 */
import Format from "./format.js";
import "../formats/index.js";
import hooks from "./hooks.js";
import { toArray, phrase, type } from "./util.js";

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

	static get title () {
		return this.name.replace(/([a-z])([A-Z])/g, "$1 $2");
	}

	/**
	 * Update an existing backend instance with new parameters
	 * @param {string} url - Same as constructor
	 * @param {object} o - Same as constructor
	 */
	update (url, o = {}) {
		if (url) {
			this.source = url;
			this.file = this.#getFile(url);
		}

		if (o) {
			this.options = Object.assign(this.options ?? {}, o);

			// Options object has higher priority than url
			for (let prop in this.file) {
				if (prop in o) {
					this.file[prop] = o[prop];
				}
			}
		}
	}

	async parse (data, { file } = {}) {
		if (type(data) !== "string") {
			// Already parsed
			return data;
		}

		if (type(this.options.parse) === "function") {
			// parse should take precedence over format
			return this.options.parse(data);
		}

		return this.#getFormat(file).parse(data);
	}

	async stringify (data, { file } = {}) {
		if (type(data) === "string") {
			// Already stringified
			return data;
		}

		if (type(this.options.stringify) === "function") {
			// stringify should take precedence over format
			return this.options.stringify(data);
		}

		return this.#getFormat(file).stringify(data);
	}

	#getFormat (file) {
		let format = this.options.format;

		if (!format && this.constructor.fileBased && file) {
			// If file-based, try to match the filename first
			let extension = (file.filename ?? file.path ?? file.url).match(/\.(\w+)$/)?.[1];
			if (extension) {
				format = Format.find({extension});
			}
		}

		format ??= this.constructor.defaultFormat;

		if (format && typeof format === "string") {
			format = Format.find(format);

			if (!format) {
				throw new Error(`No format found for "${this.options.format}"`);
			}

			if (this.options.format) {
				this.options.format = format;
			}
			else {
				this.constructor.defaultFormat = format;
			}
		}

		return format;
	}

	updatePermissions (o) {
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
	 * @param {...any} args
	 * @returns {object} - Data from the backend as a JSON object, `null` if not found
	 */
	async load (url, ...args) {
		await this.ready;

		let file = this.#getFile(url);

		let response = await this.get(file, ...args);

		if (typeof response !== "string") {
			// Backend did the parsing, we're done here
			this.rawData = null;
			this.data = response;
		}
		else {
			response = response.replace(/^\ufeff/, ""); // Remove Unicode BOM

			this.rawData = response;
			this.data = await this.parse(response, { file });
		}

		this.dispatchEvent(new CustomEvent("mv-load", {
			detail: {
				url, file, response,
				data: this.data,
				rawData: this.rawData,
				backend: this
			}
		}));

		return this.data;
	}

	/**
	 * Higher-level method for writing data to the backend.
	 * Subclasses should usually NOT override this method.
	 * @param {object} data - Data to write to the backend
	 * @param {object} [o] - Options object
	 * @returns {object} - If successful, info about the file
	 */
	async store (data, o = {}) {
		await this.ready;

		if (typeof o === "string") {
			o = {url: o};
		}

		let {file, url, ...options} = o;

		file = this.#getFile(file ?? url);

		return this.put(data, {file, ...options});
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

	static parseURL (source) {
		let url = new URL(source);
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

			if (!Class) {
				throw new Error(`No backend found for type "${o.type}"`);
			}
		}
		else {
			// Find a suitable backend
			if (url && this.all.length > 0) {
				Class = this.find(url, o) ?? Backend.Remote;
			}
			else {
				// No registered backends under this, use this directly
				Class = this;
			}
		}

		// Can we re-use an existing object perhaps?
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

	static async load (url, o) {
		let backend = this.from(url, o);

		if (backend) {
			return backend.load(url, o);
		}
		else {
			throw new Error(`No backend found for ${url}`);
		}
	}

	static _all = [];

	// Get all descendant backends
	static get all () {
		if (this === Backend) {
			return Backend._all;
		}

		return Backend._all.filter(backend => backend.prototype instanceof this);
	}

	static find (url, o) {
		if (url) {
			let backends = this.all;
			for (let backend of backends) {
				// Check first if backend is a descendant class of this
				// This allows calling create on child classes to narrow the scope of the search
				// And then if the URL is one of the URLs handled by it
				if (backend.test?.(url, o)) {
					return backend;
				}
			}
		}

		return null;
	}

	static register (Class) {
		Backend[Class.name] = Class;
		Backend._all.push(Class);
		return Class;
	}

	static hooks = hooks;
	static defaultFormat = "JSON";

	static phrase (id, ...args) {
		return phrase(this, id, ...args);
	}

	/**
	 * Auth Provider to use.
	 * This is only relevant for OAuthBackend, but specifying here as Backend is the only class users import.
	 */
	static authProvider = "https://auth.madata.dev";

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
}