import OAuthBackend from "../../src/oauth-backend.js";

/**
 * @category Coda
 */
export default class Coda extends OAuthBackend {
	static defaultPermissions = { read: true };
	static api = {
		...super.api,
		user: {
			get: "whoami",
			fields: {
				username: "name",
				name: "name",
				avatar: "pictureLink",
				email: "loginId",
				url: function () {
					return "https://coda.io/@" + this.username;
				},
			},
		},
	};

	async activeLogin () {
		open("https://coda.io/account/#apiSettings", "_blank");

		let accessToken = prompt(this.constructor.phrase("login_prompt"));

		if (accessToken) {
			this.storeLocalUserInfo({accessToken});
		}
	}

	static apiDomain = "https://coda.io/apis/v1/";

	static phrases = {
		"login_prompt": "Enter your Coda API token. You can find it in your Coda account settings."
	};
}
