/** @module Base */

import Backend from "./backend.js";

/**
 * Backend that supports authentication.
 * @class AuthBackend
 * @extends Backend
 * @abstract
 */
export default class AuthBackend extends Backend {
	constructor (url, o = {}) {
		super(url, o);

		this.updatePermissions({
			login: true
		});

		this.login({passive: true});

		if (o.syncWith) {
			this.syncWith(o.syncWith);
		}
	}

	/**
	 * Is current user authenticated?
	 * Synchronous because it must not trigger any API calls, use passiveLogin() for that
	 * @returns {boolean}
	 */
	isAuthenticated () {
		return !!this.user;
	}

	/**
	 * Get info about the current user, if logged in.
	 * Subclasses are generally expected to override this.
	 * @returns {Promise<object>} - User info
	 */
	async getUser () {
		return this.user ?? null;
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

		await this.passiveLogin(rest);

		if (this.isAuthenticated()) {
			try {
				await this.getUser();
			}
			catch (e) {
				if (e.status == 401) {
					// Unauthorized. We have corrupt local data, discard it
					this.deleteLocalUserInfo();
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

	async logout () {
		let wasAuthenticated = this.isAuthenticated();

		if (wasAuthenticated) {
			this.deleteLocalUserInfo();

			// TODO does this really represent all backends? Should it be a setting?
			this.updatePermissions({
				login: true,
				logout: false
			});

			this.user = null;

			if (wasAuthenticated) {
				// We may force logout to clean up corrupt data
				// But we don't want to trigger a logout event in that case
				this.dispatchEvent(new CustomEvent("mv-logout"));
			}
		}
	}

	/**
	 * Store info that can be used to log users in passively
	 * @abstract
	 * @param {object} [options]
	 * @returns
	 */
	async storeLocalUserInfo (o = {}) {
		throw new TypeError("Not implemented");
	}

	/**
	 * @abstract
	 * Delete any info used to log users in passively
	 */
	deleteLocalUserInfo () {
		throw new TypeError("Not implemented");
	}

	/**
	 * Sync the logged in user, i.e. log in passively when another backend has logged in and log out when another backend has logged out.
	 * Generally intended to be used for backends with the same authentication mechanism.
	 * Syncing is not two-way, you need to call this on the other backend as well to make it so.
	 * @param {AuthBackend} backend
	 */
	syncWith (backend) {
		if (backend.isAuthenticated() && !this.isAuthenticated()) {
			this.passiveLogin();
			this.user = backend.user;
		}

		backend.addEventListener("mv-login", async _ => {
			if (!this.isAuthenticated()) {
				this.passiveLogin();
				this.user = backend.user;
			}
		});

		backend.addEventListener("mv-logout", _ => this.logout());
	}

	static phrases = {
		"authentication_error": "Authentication error",
	};
}
