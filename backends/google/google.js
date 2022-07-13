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

	get #allScopes () {
		return [...(this.constructor.scopes ?? []), "https://www.googleapis.com/auth/userinfo.profile"];
	}

	oAuthParams = () => `&redirect_uri=${encodeURIComponent("https://auth.mavo.io")}&response_type=code&scope=${encodeURIComponent(this.#allScopes.join(" "))}`

	static oAuth = "https://accounts.google.com/o/oauth2/auth"
	static clientId = "380712995757-4e9augrln1ck0soj8qgou0b4tnr30o42.apps.googleusercontent.com"
	static apiKey = "AIzaSyCiAkSCE96adO_mFItVdS9fi7CXfTiwhe4"
	static useCache = false

	static phrases = {
		access_token_invalid: "Access token is invalid. Please, log in again.",
		api_key_invalid: key => `The API key “${key}” is not valid. Please provide a valid API key.`
	}
}