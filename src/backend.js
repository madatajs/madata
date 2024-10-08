/** @module Base */

import hooks from "./hooks.js";
import { toArray, phrase, type, testURLs, matchURLs, URLPattern } from "./util.js";
import Format from "./format.js";
import JSON from "../formats/json/index.js";

// We need at least JSON for most cases
Format.register(JSON);


/**
 * Base class for all backends.
 */
export default class Backend extends EventTarget {
	static capabilities = {};
	static phrases = {
		"created_file": (name = "file") => "Created " + name,
		"updated_file": (name = "file") => "Updated " + name,
		"uploaded_file": (name = "file") => "Uploaded " + name,
		"deleted_file": (name = "file") => "Deleted " + name,
		"no_write_permission": "You do not have permission to write files.",
		"no_upload_permission": "You do not have permission to upload files.",
		"something_went_wrong_while_connecting": name => "Something went wrong while connecting to " + name,
	};
	static _all = [];
	static hooks = hooks;
	static defaultFormat = "JSON";
	static api = {};

	/**
	 * @param {string} source - URL string describing the data location
	 * @param {object} o - Options
	 */
	constructor (source, o = {}) {
		super();

		// Permissions of this particular backend.
		this.permissions = Object.assign({}, this.constructor.defaultPermissions);

		this.update(source, o);
	}

	static get title () {
		return this.name.replace(/([a-z])([A-Z])/g, "$1 $2");
	}

	/**
	 * Update an existing backend instance with new parameters
	 * @param {string} source - Same as constructor
	 * @param {object} o - Same as constructor
	 */
	update (source, o = {}) {
		if (source) {
			this.source = source;
		}

		if (source || !this.ref) {
			this.ref = this._getRef(source);
		}

		if (o) {
			this.options = Object.assign(this.options ?? {}, o);

			// Options object has higher priority than url
			for (let prop in this.ref) {
				if (prop in o) {
					this.ref[prop] = o[prop];
				}
			}
		}
	}

	async parse (data, { ref } = {}) {
		if (type(data) !== "string") {
			// Already parsed
			return data;
		}

		if (type(this.options.parse) === "function") {
			// parse should take precedence over format
			return this.options.parse(data);
		}

		return this.#getFormat(ref).parse(data);
	}

	async stringify (data, { ref } = {}) {
		if (type(data) === "string") {
			// Already stringified
			return data;
		}

		if (type(this.options.stringify) === "function") {
			// stringify should take precedence over format
			return this.options.stringify(data);
		}

		return this.#getFormat(ref).stringify(data);
	}

	#getFormat (ref) {
		let format = this.options.format;

		if (!format && this.constructor.fileBased && ref) {
			// If file-based, try to match the filename first
			let extension = (ref.filename ?? ref.path ?? ref.url.pathname).match(/\.(\w+)$/)?.[1];
			if (extension) {
				format = Format.find({extension});
			}
		}

		format ??= this.constructor.defaultFormat;
		let formatObj = format;

		// Resolve format specifier (e.g. "json")
		if (format && typeof format === "string") {
			formatObj = Format.find(format, {require: true});

			if (this.options.format) {
				// If this backend specified a format option, replace it with the actual format object
				this.options.format = formatObj;
			}
			else {
				this.constructor.defaultFormat = formatObj;
			}
		}

		return formatObj;
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
	 * Helper for making HTTP requests with JSON-based APIs.
	 * @param {string} call - API endpoint
	 * @param {object} [data] - Data to send with the request
	 * @param {string} [method=GET] - HTTP method
	 * @param {object} [req] - Extra request options
	 * @param {string} [req.responseType=json] - Response type
	 * @param {object} [req.headers] - Extra headers
	 * @return {Promise<object>} - JSON response
	 */
	async request (call, data, method = "GET", req) {
		req = Object.assign({}, req); // clone
		req.method = req.method || method;
		req.responseType = req.responseType || "json";

		req.headers = Object.assign({
			"Content-Type": "application/json; charset=utf-8"
		}, req.headers || {});

		req.body = data;

		call = new URL(call, this.constructor.apiDomain ?? this.constructor.host ?? globalThis.location?.origin);

		// Prevent getting a cached response. Cache-control is often not allowed via CORS
		if (req.method == "GET" && call.protocol != "data:" && this.constructor.useCache !== false) {
			call.searchParams.set("timestamp", Date.now());
		}

		if (type(req.body) === "object") {
			if (req.method === "GET" || req.method === "HEAD") {
				for (let p in req.body) {
					let action = req.body[p] === undefined ? "delete" : "set";
					call.searchParams[action](p, req.body[p]);
				}

				delete req.body;
			}
			else {
				req.body = JSON.stringify(req.body);
			}
		}

		let response;

		try {
			response = await fetch(call, req);
		}
		catch (err) {
			throw new Error(this.constructor.phrase("something_went_wrong_while_connecting", this.constructor.name), err);
		}

		if (response?.ok) {
			if (req.method === "HEAD" || req.responseType === "response") {
				return response;
			}
			else {
				return response[req.responseType]();
			}
		}
		else if (response.status === 404 && req.method === "GET") {
			return null;
		}
		else {
			let isJSON = response.headers.get("content-type")?.includes("application/json");
			let error = isJSON ? await response.json() : await response.text();
			throw error;
		}
	}

	/**
	 * Low-level method to fetch data from the backend. Subclasses should override this method.
	 * Clients should not call this method directly, but use `load()` instead.
	 * @param {object} ref - reference to data to fetch, if different from that provided in the constructor
	 * @returns {string} - Data from the backend as a string, `null` if not found
	 */
	async get (ref = this.ref) {
		let url = new URL(ref.url);
		if (url.protocol != "data:" && this.constructor.useCache !== false) {
			url.searchParams.set("timestamp", Date.now()); // ensure fresh copy
		}

		let call = this.constructor.api.get?.(ref) ?? ref.url;
		return this.request(call);
	}

	_getRef (ref) {
		if (typeof ref === "string") {
			// ref is a URL
			if (/^\w+:/.test(ref)) {
				// Absolute URL
				return this.constructor.parseURL(ref);
			}

			// Relative path
			return Object.assign({}, this.ref, {path: ref});
		}

		// Either (default) ref object, or empty value
		return ref ?? this.ref ?? this.constructor.parseURL();
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

		let ref = this._getRef(url);

		let response = await this.get(ref, ...args);

		if (typeof response !== "string") {
			// Backend did the parsing, we're done here
			this.rawData = null;
			this.data = response;
		}
		else {
			response = response.replace(/^\ufeff/, ""); // Remove Unicode BOM

			this.rawData = response;
			this.data = await this.parse(response, { ref });
		}

		this.dispatchEvent(new CustomEvent("mv-load", {
			detail: {
				url, ref, response,
				data: this.data,
				rawData: this.rawData,
				backend: this
			}
		}));

		return this.data;
	}

	async put (data, options) {
		if (!this.constructor.capabilities.put) {
			// TODO localize
			throw new Error("This backend does not support writing files");
		}
	}

	async upload (file, options) {
		if (!this.constructor.capabilities.upload) {
			// TODO localize
			throw new Error("This backend does not support uploading files");
		}
	}

	/**
	 * Higher-level method for writing data to the backend.
	 * Subclasses should usually NOT override this method.
	 * @param {object} data - Data to write to the backend
	 * @param {object} [o] - Options object
	 * @returns {object} - If successful, info about the stored data
	 */
	async store (data, o = {}) {
		await this.ready;

		if (typeof o === "string") {
			o = {url: o};
		}

		let {ref, url, ...options} = o;

		ref = this._getRef(ref ?? url);

		return this.put(data, {ref, ...options});
	}

	async remove (ref = this.ref) {
		await this.ready;

		if (!this.delete) {
			throw new Error("This backend does not support deleting files");
		}

		ref = this._getRef(ref);

		return this.delete(ref);
	}

	toString () {
		return `${this.constructor.name} (${this.source})`;
	}

	equals (backend) {
		return backend === this || (backend && this.constructor == backend.constructor && this.source == backend.source);
	}

	static test (source) {
		return testURLs(source, this.urls);
	}

	/**
	 * Return the hostname of the first URL pattern in the `urls` array, if not variable.
	 * This is used to facilitate relative URLs when constructing Backends directly.
	 * Subclasses with variable hostnames can override this.
	 */
	static get host () {
		if (!this.urls) {
			return undefined;
		}

		if (!(this.urls[0] instanceof URLPattern)) {
			this.urls[0] = new URLPattern(this.urls[0]);
		}

		let host = this.urls[0].hostname;

		if (host === "*") {
			return undefined;
		}

		return host;
	}

	static parseURL (source) {
		let ret = Object.assign({}, this.defaults);

		if (!source) {
			return ret;
		}

		let base = this.host ? "https://" + this.host.replace(/^(\*\.)+/, "") : null;
		ret.url = base ? new URL(source, base) : new URL(source);

		Object.assign(ret, matchURLs(source, this.urls) ?? matchURLs(source, this.urlsKnown));

		return ret;
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

		return Class ? new Class(url, o) : null;
	}

	static async load (url, o) {
		let backend = this.from(url, o);

		if (backend) {
			return backend.load();
		}
		else {
			throw new Error(`No backend found for ${url}`);
		}
	}

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

		// We should find the right place for a backend to be registered among the registered backends:
		// it should be placed before its parent, if any.
		let index = Backend._all.length; // place the backend at the end by default
		for (let i = 0; i < Backend._all.length; i++) {
			let backend = Backend._all[i];
			if (Class.prototype instanceof backend) {
				// Found a parent class, place before it
				index = i;
				break;
			}
		}

		Backend._all.splice(index, 0, Class);

		return Class;
	}

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
