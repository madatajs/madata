/**
 * Base class for all Google backends, containing auth methods
 * @class Google
 * @extends OAuthBackend
 */
import OAuthBackend from "../../src/oauth-backend.js";

export default class Google extends OAuthBackend {
	constructor (url, o) {
		super(url, o);

		this.apiKey = o.apiKey ?? this.constructor.apiKey;

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
		return `&redirect_uri=${encodeURIComponent(this.authProvider)}&response_type=code&scope=${encodeURIComponent(this.constructor.scopes.join(" "))}`;
	}

	static oAuth = "https://accounts.google.com/o/oauth2/auth"
	static clientId = "375702642766-9n3p8i52lnkus451fojeqoreg8akss59.apps.googleusercontent.com"
	static apiKey = "AIzaSyBWd4LzYlUZ_IAv096ojIsx6nOGmYy3VB0"
	static useCache = false

	static phrases = {
		access_token_invalid: "Access token is invalid. Please, log in again."
	}
}