import OAuthBackend from "../../src/oauth-backend.js";

/**
 * Base class for all Google backends, containing auth methods.
 * @category Google
 */
export default class Google extends OAuthBackend {
	static defaultPermissions = { read: true };
	static oAuth = "https://accounts.google.com/o/oauth2/auth";
	static useCache = false;
	static api = {
		...super.api,
		user: {
			get: "https://www.googleapis.com/oauth2/v2/userinfo",
			fields: {
				username: "email",
				name: ["name", "displayName"],
				avatar: ["picture", "photoURL"],
			},
		},
	};

	static get oAuthParams () {
		return super.oAuthParams + `&scope=${ encodeURIComponent(this.scopes.join(" ")) }`;
	}
}
