import Backend from "./backend.js";
/**
 * Backend that supports authentication
 */
export default class AuthBackend extends Backend {
	constructor (url, o = {}) {
		super(url, o);

		this.updatePermissions({
			login: true
		});

		this.login({passive: true});
	}

	isAuthenticated () {
		return !!this.user;
	}

	async getUser () {
		if (this.user) {
			return this.user;
		}
	}

	async login () {}
	async logout () {}

	static phrases = {
		"authentication_error": "Authentication error",
	}
}