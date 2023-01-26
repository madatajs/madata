/**
 * Base class for all Google backends, containing auth methods
 * @class Google
 * @extends OAuthBackend
 */
import OAuthBackend from "../../src/oauth-backend.js";

export default class Google extends OAuthBackend {
	constructor (url, o) {
		super(url, o);

		this.updatePermissions({ read: true });
	}

	async getUser () {
		if (this.user) {
			return this.user;
		}

		const info = await this.request("https://www.googleapis.com/oauth2/v2/userinfo");

		return this.user = {
			name: info.name || info.displayName,
			avatar: info.picture || info.photoURL,
			...info
		};
	}

	oAuthParams () {
		return `&redirect_uri=${encodeURIComponent(this.constructor.authProvider)}&response_type=code&scope=${encodeURIComponent(this.constructor.scopes.join(" "))}`;
	}

	static oAuth = "https://accounts.google.com/o/oauth2/auth"
	static useCache = false

	static phrases = {
		access_token_invalid: "Access token is invalid. Please, log in again."
	}
}