import OAuthBackend from "../../src/oauth-backend.js";
import { readFile } from "../../src/util.js";

/**
 * @category GitLab
 */
export default class Gitlab extends OAuthBackend {
	static capabilities = { auth: true, put: true, upload: true };
	static defaultPermissions = { read: true };
	static apiDomain = "https://gitlab.com/api/v4/";
	static oAuth = "https://gitlab.com/oauth/authorize";
	static fileBased = true;

	static urls = [
		"http{s}?://gitlab.com/:id(.+)/-/blob/:branch/:path(.+)",
	];

	static api = {
		...super.api,
		user: {
			get: "user",
			fields: {
				username: "username",
				name: ["name", "username"],
				avatar: "avatar_url",
				url: "web_url",
			},
		},
		put: ref => `projects/${ ref.id }/repository/files/${ encodeURIComponent(ref.path) }`,
	};

	static parseURL (source) {
		let ret = super.parseURL(source);
		["id", "path"].forEach(key => ret[key] = encodeURIComponent(ret[key]));
		ret.fileCall = `projects/${ ret.id }/repository/files/${ ret.path }`;
		return ret;
	}

	async put (data, {ref = this.ref} = {}) {
		let { fileCall, path, branch } = ref;
		let body = {
			branch,
			content: await this.stringify(data, {ref}),
			commit_message: this.constructor.phrase("updated_file", path),
		};
		return this.request(fileCall, body, "PUT");
	}

	async upload (file, path = file.name) {
		let { id, branch } = this.ref;
		let fileCall = `projects/${ id }/repository/files/${ encodeURIComponent(path) }`;

		let content = await readFile(file);

		let body = {
			branch,
			content: content.data,
			commit_message: this.constructor.phrase("uploaded_file", path),
			encoding: content.encoding,
		};
		return this.request(fileCall, body, "POST");
	}
}
