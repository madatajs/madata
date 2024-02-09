import OAuthBackend from "../../src/oauth-backend.js";

/**
 * Base class for all Google backends, containing auth methods.
 * @class Google
 * @extends OAuthBackend
 * @category Google
 */
export default class Google extends OAuthBackend {
	constructor (url, o) {
		super(url, o);

		this.updatePermissions({ read: true });
	}

	static userCall = "https://www.googleapis.com/oauth2/v2/userinfo";
	static userSchema = {
		username: "email",
		name: ["name", "displayName"],
		avatar: ["picture", "photoURL"],
	};

	oAuthParams () {
		return `&redirect_uri=${this.constructor.authProvider}&response_type=code&scope=${encodeURIComponent(this.constructor.scopes.join(" "))}`;
	}

	static oAuth = "https://accounts.google.com/o/oauth2/auth";
	static useCache = false;

	static phrases = {
		access_token_invalid: "Access token is invalid. Please, log in again."
	};
}
