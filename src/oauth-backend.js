/** @module Base */

import hooks from "./hooks.js";
import AuthBackend from "./auth-backend.js";
import {type} from "./util.js";
import { localStorage } from "./node-shims.js";

/**
 * OAuth 2.0 backends.
 * @class OAuthBackend
 * @extends AuthBackend
 */
export default class OAuthBackend extends AuthBackend {
	/**
	 * @param {string} url - URL string describing the data location
	 * @param {object} o - Options
	 */
	constructor (url, o = {}) {
		super(url, o);

		if (this.constructor.oAuth) {
			// Subclasses that also have async dependencies must do
			// this.ready = Promise.all([super.ready, ...])
			// instead of just overwriting this.ready
			this.ready = Promise.resolve(this.constructor.authProviderServices).then(services => {
				let meta = services[this.constructor.getOAuthBackend().name];
				this.clientId = meta.client_id;

				if (meta.api_key && !("apiKey" in this.options)) {
					this.apiKey = meta.api_key;
				}
			});
		}
	}

	/**
	 * Update an existing backend instance with new parameters
	 * @param {string} url - Same as constructor
	 * @param {object} o - Same as constructor
	 */
	update (url, o) {
		super.update(url, o);

		if (o?.accessToken) {
			if (this.accessToken !== o.accessToken) {
				this.deleteLocalUserInfo();
			}
		}

		if (o?.apiKey) {
			// Some backends (e.g. Firebase) require a separate API key per project
			this.apiKey = o.apiKey;
		}
	}

	isAuthenticated () {
		return !!this.accessToken;
	}

	// Any extra params to be passed to the oAuth URL.
	oAuthParams () {
		return "";
	}

	/**
	 * Helper for making OAuth requests with JSON-based APIs.
	 * @param {string} call - API endpoint
	 * @param {object} [data] - Data to send with the request
	 * @param {string} [method=GET] - HTTP method
	 * @param {object} [req] - Extra request options
	 * @param {string} [req.responseType=json] - Response type
	 * @param {object} [req.headers] - Extra headers
	 * @return {Promise<object>} - JSON response
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

	static getOAuthBackend () {
		if (this.hasOwnProperty("oAuth")) {
			return this;
		}

		let parent = Object.getPrototypeOf(this);

		if (this.prototype.getUser !== parent.prototype.getUser) {
			return this;
		}

		return parent.getOAuthBackend?.();
	}

	/**
	 * Helper method for authenticating in OAuth APIs
	 * @param [options] {object}
	 * @param [options.passive] {boolean} - Do not trigger any login UI, just return the current user if already logged in
	 * @return {Promise<UserObject | null>}
	 */
	async login ({passive = false, accessToken = this.options.accessToken, ...rest} = {}) {
		if (this.ready) {
			await this.ready;
		}

		// Programmatically providing an access token is ALWAYS passive
		passive = passive || Boolean(accessToken);
		let currentUser;

		if (this.isAuthenticated()) {
			currentUser = this.getUserIfValid();

			if (currentUser) {
				return currentUser;
			}
		}

		if (passive) {
			if (accessToken) {
				// Access token provided explicitly, no need to show any UI
				this.storeLocalUserInfo({ accessToken });
			}
			else {
				await this.passiveLogin(rest);
			}
		}
		else {
			await this.activeLogin(rest);
		}

		// Validate provided/stored access token before activeLogin()
		// so that if it's invalid, we can show the login UI
		currentUser = await this.getUserIfValid();

		if (currentUser) {
			this.dispatchEvent(new CustomEvent("mv-login"));
			this.updatePermissions({login: false, logout: true});
			return currentUser;
		}
		else if (this.isAuthenticated()) {
			throw new Error(this.constructor.phrase("invalid_access_token"));
		}
	}

	async getUserIfValid () {
		if (this.isAuthenticated()) {
			// We seem to have credentials already, but are they valid?
			let user;

			try {
				user = await this.getUser();
			}
			catch (e) {
				if (e.status == 401) {
					// Unauthorized. Access token we have is invalid, discard it
					this.deleteLocalUserInfo();
					return null;
				}
			}

			return user;
		}

		return null;
	}

	async activeLogin (o) {
		let accessToken;

		let oAuthBackend = this.constructor.getOAuthBackend();

		// Show window
		let popup = {
			width: Math.min(1000, innerWidth - 100),
			height: Math.min(800, innerHeight - 100)
		};

		popup.top = (screen.height - popup.height) / 2;
		popup.left = (screen.width - popup.width) / 2;

		let state = {
			url: globalThis.location?.href,
			backend: oAuthBackend.name
		};

		this.authPopup = open(`${this.constructor.oAuth}?client_id=${this.clientId}&state=${encodeURIComponent(JSON.stringify(state))}` + this.oAuthParams(),
			"popup", `width=${popup.width},height=${popup.height},left=${popup.left},top=${popup.top}`);

		if (!this.authPopup) {
			throw new Error(this.constructor.phrase("popup_blocked"));
		}

		accessToken = await new Promise((resolve, reject) => {
			addEventListener("message", evt => {
				if (evt.source === this.authPopup && evt.data.backend) {
					if (evt.data.backend == oAuthBackend.name) {
						resolve(evt.data.token);
					}

					if (!this.accessToken) {
						reject(Error(this.constructor.phrase("authentication_error")));
					}
				}
			});
		});

		this.storeLocalUserInfo({ accessToken });

		hooks.run("oauth-login-success", this);

		return this.accessToken;
	}

	async passiveLogin () {
		this.accessToken = localStorage[this.constructor.tokenKey];
	}

	/**
	 * oAuth logout helper
	 */
	async logout () {
		super.logout();

		if (!this.isAuthenticated()) {
			// TODO does this really represent all backends? Should it be a setting?
			this.updatePermissions({
				edit: false,
				add: false,
				delete: false,
				save: false,
			});
		}
	}

	/**
	 * Store access token in local storage
	 * @param {*} param0
	 * @returns
	 */
	async storeLocalUserInfo ({ accessToken }) {
		localStorage[this.constructor.tokenKey] = this.accessToken = accessToken;
	}

	/**
	 * Delete access token from local storage
	 */
	deleteLocalUserInfo () {
		localStorage.removeItem(this.constructor.tokenKey);
		delete this.user;
		delete this.accessToken;
	}

	static get tokenKey () {
		let name = this.getOAuthBackend()?.name || this.name;
		let id = name.toLowerCase();
		let authProvider = new URL(this.authProvider).hostname;

		if (authProvider === "auth.mavo.io") {
			// Backwards compatibility
			return `mavo:${id}token`;
		}

		return `madata:token:${authProvider}/${id}`;
	}

	static phrases = {
		"popup_blocked": "Login popup was blocked! Please check your popup blocker settings.",
		"something_went_wrong_while_connecting": name => "Something went wrong while connecting to " + name,
		"invalid_access_token": "Invalid access token",
	};
}
