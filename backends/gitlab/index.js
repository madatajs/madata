import OAuthBackend from "../../src/oauth-backend.js";

/**
 * @category GitLab
 */
export default class Gitlab extends OAuthBackend {
	static capabilities = { auth: true, put: true, upload: false };
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
		ret.apiCall = `projects/${ encodeURIComponent(ret.id) }/repository/files/${ ret.path }`;
		return ret;
	}

	get (ref = this.ref) {
		let { apiCall, branch } = ref;
		return this.request(`${ apiCall }/raw?ref=${ branch }`);
	}

	async put (data, {ref = this.ref} = {}) {
		let { apiCall, path, branch } = ref;
		let body = {
			branch,
			content: await this.stringify(data, {ref}),
			commit_message: `Update file ${ path }`,
		};
		return this.request(apiCall, body, "PUT");
	}
}
