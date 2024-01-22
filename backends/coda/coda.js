import OAuthBackend from "../../src/oauth-backend.js";

/**
 * @class Coda
 * @extends OAuthBackend
 * @category Coda
 */
export default class Coda extends OAuthBackend {
	constructor (url, o) {
		super(url, o);

		this.updatePermissions({ });
	}

	async getUser () {
		if (this.user) {
			return this.user;
		}

		let info = await this.request("whoami");

		return this.user = {
			username: info.name,
			name: info.name,
			avatar: info.pictureLink,
			url: "https://github.com/" + info.login,
			email: info.loginId,
			raw: info
		};
	}

	async activeLogin () {
		open("https://coda.io/account/#apiSettings", "_blank");

		let accessToken = prompt(this.constructor.phrase("login_prompt"));

		if (accessToken) {
			this.storeLocalUserInfo({accessToken});
		}
	}

	static apiDomain = "https://coda.io/apis/v1/";
	static host = "coda.io";

	static phrases = {
		"login_prompt": "Enter your Coda API token. You can find it in your Coda account settings."
	};
}
