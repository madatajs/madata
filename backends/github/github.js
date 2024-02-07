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

	static userSchema = {
		username: "login",
		name: ["name", "login"],
		avatar: "avatar_url",
		url: function () {
			return "https://github.com/" + this.username;
		},
	};

	static apiDomain = "https://api.github.com/";
	static oAuth = "https://github.com/login/oauth/authorize";
}
