import hooks from './hooks.js';
import AuthBackend from "./auth-backend.js";
import {type} from "./util.js";

/**
 * OAuth 2.0 backends
 */

export default class OAuthBackend extends AuthBackend {
	constructor (url, o = {}) {
		super(url, o);
	}

	update(url, o) {
		super.update(url, o);

		if (this.constructor.clientId ?? o.clientId) {
			this.clientId = o.clientId ?? this.constructor.clientId;
		}
	}

	isAuthenticated () {
		return !!this.accessToken;
	}

	// Any extra params to be passed to the oAuth URL.
	oAuthParams = () => ""

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

		if (type(req.body) === "object") {
			if (req.method === "GET" || req.method === "HEAD") {
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
			throw response;
		}
	}

	static getOAuthProvider() {
		if (this.hasOwnProperty("oAuth")) {
			return this;
		}
		else {
			let parent = Object.getPrototypeOf(this);
			return parent.getOAuthProvider?.();
		}
	}

	/**
	 * Helper method for authenticating in OAuth APIs
	 */
	async login ({passive = false} = {}) {
		if (this.ready) {
			await this.ready;
		}

		if (this.isAuthenticated()) {
			return this.getUser();
		}

		let authProvider = this.constructor.getOAuthProvider();

		let id = authProvider.name.toLowerCase();

		this.accessToken = localStorage[this.constructor.tokenKey];

		if (this.accessToken) {
			try {
				await this.getUser()
			}
			catch (e) {
				if (e.status == 401) {
					// Unauthorized. Access token we have is invalid, discard it
					localStorage.removeItem(this.constructor.tokenKey);
					delete this.accessToken;
				}
			}
		}

		if (!passive) {
			// Show window
			let popup = {
				width: Math.min(1000, innerWidth - 100),
				height: Math.min(800, innerHeight - 100)
			};

			popup.top = (screen.height - popup.height)/2;
			popup.left = (screen.width - popup.width)/2;

			var state = {
				url: location.href,
				backend: authProvider.name
			};

			this.authPopup = open(`${this.constructor.oAuth}?client_id=${this.clientId}&state=${encodeURIComponent(JSON.stringify(state))}` + this.oAuthParams(),
				"popup", `width=${popup.width},height=${popup.height},left=${popup.left},top=${popup.top}`);

			if (!this.authPopup) {
				throw new Error(this.constructor.phrase("popup_blocked"));
			}

			let accessToken = await new Promise((resolve, reject) => {
				addEventListener("message", evt => {
					if (evt.source === this.authPopup) {
						if (evt.data.backend == authProvider.name) {
							resolve(evt.data.token);
						}

						if (!this.accessToken) {
							reject(Error(this.constructor.phrase("authentication_error")));
						}
					}
				});
			});

			this.accessToken = localStorage[this.constructor.tokenKey] = accessToken;

			hooks.run("oauth-login-success", this);
		}

		if (this.isAuthenticated()) {
			let user = await this.getUser();
			this.dispatchEvent(new CustomEvent("mv-login"));
			this.updatePermissions({login: false, logout: true});
			return user;
		}
	}

	/**
	 * oAuth logout helper
	 */
	async logout () {
		if (this.isAuthenticated()) {
			var id = this.constructor.name.toLowerCase();

			localStorage.removeItem(this.constructor.tokenKey);
			delete this.accessToken;

			// TODO does this really represent all backends? Should it be a setting?
			this.updatePermissions({
				edit: false,
				add: false,
				delete: false,
				save: false,
				login: true
			});

			this.user = null;

			this.dispatchEvent(new CustomEvent("mv-logout"));
		}
	}

	static get tokenKey () {
		let name = this.getOAuthProvider()?.name || this.name;
		return `mavo:${name.toLowerCase()}token`;
	}

	static phrases = {
		"popup_blocked": "Login popup was blocked! Please check your popup blocker settings.",
		"something_went_wrong_while_connecting": name => "Something went wrong while connecting to " + name,
	}
}