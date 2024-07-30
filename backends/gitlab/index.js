import OAuthBackend from "../../src/oauth-backend.js";

/**
 * @category GitLab
 */
export default class Gitlab extends OAuthBackend {
	static capabilities = { auth: true, put: false, upload: false };
	static defaultPermissions = { read: true };

	static fileBased = true;

	static urls = [
		"http{s}?://gitlab.com/:id(.+)/-/blob/:branch/:path(.+)",
	];

	static userCall = "user";
	static userSchema = {
		username: "username",
		name: ["name", "username"],
		avatar: "avatar_url",
		url: "web_url",
	};

	static apiDomain = "https://gitlab.com/api/v4/";
	static oAuth = "https://gitlab.com/oauth/authorize";

	static parseURL (source) {
		let ret = super.parseURL(source);
		ret.id = encodeURIComponent(ret.id);
		return ret;
	}

	get (ref = this.ref) {
		let { id, branch, path } = ref;
		return this.request(`projects/${ id }/repository/files/${ path }/raw?ref=${ branch }`);
	}
}
