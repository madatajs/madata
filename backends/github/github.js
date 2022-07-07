import OAuthBackend from "../../src/oauth-backend.js";

export default class Github extends OAuthBackend {
	constructor (url, o) {
		super(url, o);

		this.updatePermissions({ read: true });
	}

	oAuthParams = () => "&scope=repo"

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

	static apiDomain = "https://api.github.com/"
	static oAuth = "https://github.com/login/oauth/authorize"
	static clientId = "7e08e016048000bc594e"
}