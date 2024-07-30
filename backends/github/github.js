import OAuthBackend from "../../src/oauth-backend.js";

/**
 * Base class for all Github backends, containing auth methods.
 * @category GitHub
 */
export default class Github extends OAuthBackend {
	static defaultPermissions = { read: true };

	static get oAuthParams () {
		return super.oAuthParams + "&scope=user%20repo";
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
