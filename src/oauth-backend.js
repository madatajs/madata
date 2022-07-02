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
			throw new Error("Something went wrong while connecting to " + this.id, err);
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
	async login ({passive = false}) {
		await this.ready;

		if (this.isAuthenticated()) {
			return this.getUser();
		}

		let id = this.id.toLowerCase();

		this.accessToken = localStorage[`mavo:${id}token`];

		if (this.accessToken) {
			try {
				await this.getUser()
			}
			catch (e) {
				if (e.status == 401) {
					// Unauthorized. Access token we have is invalid, discard it
					localStorage.removeItem(`mavo:${id}token`);
					delete this.accessToken;
				}
			}
		}

		if (this.accessToken) {
			this.dispatchEvent(new CustomEvent("mv-login"));
			return this.user;
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
				backend: this.id
			};

			this.authPopup = open(`${this.constructor.oAuth}?client_id=${this.key}&state=${encodeURIComponent(JSON.stringify(state))}` + this.oAuthParams(),
				"popup", `width=${popup.width},height=${popup.height},left=${popup.left},top=${popup.top}`);

			if (!this.authPopup) {
				var message = "Login popup was blocked! Please check your popup blocker settings.";
				throw new Error(message);
			}

			let accessToken = await new Promise((resolve, reject) => {
				addEventListener("message", evt => {
					if (evt.source === this.authPopup) {
						if (evt.data.backend == this.id) {
							resolve(evt.data.token);
						}

						if (!this.accessToken) {
							reject(Error("Authentication error"));
						}
					}
				});
			});

			this.accessToken = localStorage[`mavo:${id}token`] = accessToken;

			hooks.run("oauth-login-success", this);
		}

		if (this.isAuthenticated()) {
			this.updatePermissions({login: false, logout: true});
			return this.getUser();
		}
	}

	/**
	 * oAuth logout helper
	 */
	async logout () {
		if (this.isAuthenticated()) {
			var id = this.id.toLowerCase();

			localStorage.removeItem(`mavo:${id}token`);
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
}