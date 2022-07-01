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
		this.url = new URL(this.source, Mavo.base);

		this.options = o;
		this.format = Mavo.Formats.create(o.format, this);

		if (this.constructor.key ?? o.key) {
			this.key = o.key ?? this.constructor.key;
		}
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

		return this.format.parse(response);
	}

	async store (data, {path, format = this.format} = {}) {
		await this.ready;

		var serialized = typeof data === "string"? data : await format.stringify(data);
		await this.put(serialized, path);

		return {data, serialized};
	}

	// To be be overriden by subclasses
	ready = Promise.resolve()
	async login () {}
	async logout () {}
	put () {
		return Promise.reject();
	}

	isAuthenticated () {
		return !!this.accessToken;
	}

	// Any extra params to be passed to the oAuth URL.
	oAuthParams = () => ""

	toString () {
		return `${this.id} (${this.url})`;
	}

	equals (backend) {
		return backend === this || (backend && this.id == backend.id && this.source == backend.source);
	}

	/**
	 * Helper for making OAuth requests with JSON-based APIs.
	 */
	async request (call, data, method = "GET", req = {}) {
		req = Object.assign({}, req); // clone
		req.method = req.method || method;
		req.responseType = req.responseType || "json";

		req.headers = Object.assign({
			"Content-Type": "application/json; charset=utf-8"
		}, req.headers || {});

		if (this.isAuthenticated()) {
			req.headers["Authorization"] = req.headers["Authorization"] || `Bearer ${this.accessToken}`;
		}

		req.body = data;

		call = new URL(call, this.constructor.apiDomain);

		// Prevent getting a cached response. Cache-control is often not allowed via CORS
		if (req.method == "GET" && this.constructor.useCache !== false) {
			call.searchParams.set("timestamp", Date.now());
		}

		if ($.type(req.body) === "object") {
			if (req.method == "GET") {
				for (let p in req.body) {
					let action = req.body[p] === undefined? "delete" : "set";
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
			this.mavo.error("Something went wrong while connecting to " + this.id, err);
		}

		if (response?.ok) {
			if (req.method === "HEAD" || req.responseType === "response") {
				return response;
			}
			else {
				return response[req.responseType]();
			}
		}
		else {
			throw response;
		}
	}

	/**
	 * Helper method for authenticating in OAuth APIs
	 */
	async oAuthenticate (passive) {
		await this.ready;

		if (this.isAuthenticated()) {
			return Promise.resolve();
		}

		let id = this.id.toLowerCase();

		if (passive) {
			this.accessToken = localStorage[`mavo:${id}token`];

			if (this.accessToken) {
				resolve(this.accessToken);
			}
		}
		else {
			// Show window
			var popup = {
				width: Math.min(1000, innerWidth - 100),
				height: Math.min(800, innerHeight - 100)
			};

			popup.top = (screen.height - popup.height)/2;
			popup.left = (screen.width - popup.width)/2;

			var state = {
				url: location.href,
				backend: this.id
			};

			this.authPopup = open(`${this.constructor.oAuth}?client_id=${this.key}&state=${encodeURIComponent(JSON.stringify(state))}` + this.oAuthParams(),
				"popup", `width=${popup.width},height=${popup.height},left=${popup.left},top=${popup.top}`);

			if (!this.authPopup) {
				var message = "Login popup was blocked! Please check your popup blocker settings.";
				throw new Error(message);
			}

			return new Promise((resolve, reject) => {
				addEventListener("message", evt => {
					if (evt.source === this.authPopup) {
						if (evt.data.backend == this.id) {
							this.accessToken = localStorage[`mavo:${id}token`] = evt.data.token;
						}

						if (!this.accessToken) {
							reject(Error("Authentication error"));
						}

						resolve(this.accessToken);

						hooks.run("backend-login-success", this);
					}
				});
			});
		}

	}

	/**
	 * oAuth logout helper
	 */
	oAuthLogout () {
		if (this.isAuthenticated()) {
			var id = this.id.toLowerCase();

			localStorage.removeItem(`mavo:${id}token`);
			delete this.accessToken;

			this.updatePermissions({
				edit: false,
				add: false,
				delete: false,
				save: false,
				login: true
			});

			this.dispatchEvent(new CustomEvent("mv-logout"));
		}

		return Promise.resolve();
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
};