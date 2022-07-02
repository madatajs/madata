import Backend from "./backend.js";
/**
 * Backend that supports authentication
 */
export default class AuthBackend extends Backend {
	constructor (url, o = {}) {
		super(url, o);
	}

	isAuthenticated () {
		return !!this.user;
	}

	async login () {}
	async logout () {}
}