import OAuthBackend from "../../src/oauth-backend.js";

/**
 * Base class for all Github backends, containing auth methods.
 * @class Github
 * @extends OAuthBackend
 * @category GitHub
 */
export default class Github extends OAuthBackend {
	constructor (url, o) {
		super(url, o);

		this.updatePermissions({ read: true });
	}

	oAuthParams () {
		return "&scope=user%20repo";
	}

	async getUser () {
		if (this.user) {
			return this.user;
		}

		let info = await this.request("user");

		return this.user = {
			username: info.login,
			name: info.name || info.login,
			avatar: info.avatar_url,
			url: "https://github.com/" + info.login,
			...info
		};
	}

	static apiDomain = "https://api.github.com/";
	static oAuth = "https://github.com/login/oauth/authorize";
}
