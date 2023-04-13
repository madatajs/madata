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

	/**
	 * Is current user authenticated?
	 * Sycnrhonous because it must not trigger any API calls, use passiveLogin() for that
	 * @returns {boolean}
	 */
	isAuthenticated () {
		return !!this.user;
	}

	async getUser () {
		if (this.user) {
			return this.user;
		}
	}

	/**
	 * Log a user in, either passively (without triggering any login UI) or actively (with login UI)
	 * @param [options] {object}
	 * @param [options.passive] {boolean} - Do not trigger any login UI, just return the current user if already logged in
	 */
	async login ({passive = false, ...rest} = {}) {
		if (this.ready) {
			await this.ready;
		}

		if (this.isAuthenticated()) {
			return this.getUser();
		}

		await passiveLogin(rest);

		if (this.isAuthenticated()) {
			try {
				await this.getUser()
			}
			catch (e) {
				if (e.status == 401) {
					// Unauthorized. We have corrupt local data, discard it
					this.logout({force: true})
				}
			}
		}

		if (!passive && !this.isAuthenticated()) {
			await this.activeLogin(rest);
		}

		if (this.isAuthenticated()) {
			let user = await this.getUser();
			this.dispatchEvent(new CustomEvent("mv-login"));
			this.updatePermissions({login: false, logout: true});
			return user;
		}
	}

	/**
	 * @abstract
	 * Show authentication UI to the user. Must be implemented by subclasses
	 */
	async activeLogin () {
		throw new TypeError("Not implemented");
	}

	/**
	 * @abstract
	 * Try to authenticate a previously authenticated user (i.e. without showing any login UI)
	 */
	async passiveLogin () {
		throw new TypeError("Not implemented");
	}

	async logout () {}

	static phrases = {
		"authentication_error": "Authentication error",
	}
}