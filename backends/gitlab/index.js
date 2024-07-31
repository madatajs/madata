import OAuthBackend from "../../src/oauth-backend.js";
import { readFile } from "../../src/util.js";

/**
 * @category GitLab
 */
export default class Gitlab extends OAuthBackend {
	static capabilities = { auth: true, put: true, upload: true };
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

	static phrases = {
		"updated_file": (name = "file") => "Updated " + name,
		"uploaded_file": (name = "file") => "Uploaded " + name,
	};

	static parseURL (source) {
		let ret = super.parseURL(source);
		["id", "path"].forEach(key => ret[key] = encodeURIComponent(ret[key]));
		ret.fileCall = `projects/${ ret.id }/repository/files/${ ret.path }`;
		return ret;
	}

	get (ref = this.ref) {
		let { fileCall, branch } = ref;
		return this.request(`${ fileCall }/raw?ref=${ branch }`);
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

		let type = file.type;
		let isText = type.startsWith("text/") || type.startsWith("application/") && !type.endsWith("pdf");
		let content;
		if (isText) {
			content = await readFile(file, "Text");
		}
		else {
			content = await readFile(file);
			content = content.slice(5); // remove “data:”
			type = type.replace("+", "\\+"); // escape “+” in, e.g., “image/svg+xml”
			content = content.replace(RegExp(`^${type}(;base64)?,`), "");
		}

		let body = {
			branch,
			content,
			commit_message: this.constructor.phrase("uploaded_file", path),
			encoding: isText ? "text" : "base64",
		};
		return this.request(fileCall, body, "POST");
	}
}
