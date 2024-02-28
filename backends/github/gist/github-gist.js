import Github from "../github.js";
import hooks from "../../../src/hooks.js";

/**
 * Github Gist backend.
 * @category GitHub
 */
export default class GithubGist extends Github {
	async get (file = this.ref) {
		if (this.isAuthenticated()) {
			// Authenticated API call
			if (file.gistId) {
				let data = await this.request(`gists/${file.gistId}`, {}, "GET");
				let files = data.files;

				if (file.path && (file.path in files)) {
					return files[file.path].content;
				}
				else {
					// Requested filename not found, just return the first file
					let gistFile = Object.values(files)[0];
					file.path = gistFile.path;
					return gistFile.content;
				}
			}
			else {
				return null;
			}
		}
		else {
			// Unauthenticated, use simple GET request to avoid rate limit
			let path = "";
			if (file.path) {
				path = file.path === GithubGist.defaults.path ? "" : file.path + "/";
			}
			let url = new URL(`https://gist.githubusercontent.com/${file.owner}/${file.gistId}/raw/${path}`);
			url.searchParams.set("timestamp", Date.now()); // ensure fresh copy

			let response = await fetch(url);

			if (response.ok) {
				return response.text();
			}
			else {
				return null;
			}
		}
	}

	async put (data, {file = this.ref} = {}) {
		let call = "gists";
		let gistId = file.gistId;

		if (gistId) {
			if (!this.canPush(file)) {
				// Fork gist
				let gistInfo = await this.fork(file);
				file.owner = gistInfo.owner.login; // isn't this always this.username?
				file.gistId = gistInfo.id;
			}

			call += "/" + this.info.gistId;
		}

		let gistInfo = await this.request(call, {
			files: {
				[file.path]: {
					content: await this.stringify(data, {file})
				}
			},
			public: true
		}, "POST");

		file.gistId = gistInfo.id;
		file.owner = gistInfo.owner.login;

		if (file.gistId !== gistId) {
			// New gist created (or forked)
			let env = {context: this, file};
			hooks.run("gh-new-gist", env);
		}

		return gistInfo;
	}

	async canPush (file = this.ref) {
		// Just check if authenticated user is the same as our URL username
		// A gist can't have multiple collaborators
		return this.user && this.user.username.toLowerCase() == file.owner.toLowerCase();
	}

	async fork (file = this.ref) {
		return this.request(`gists/${file.gistId}/forks`, {}, "POST");
	}

	static urls = [
		{hostname: "gist.github.com", pathname: "/:owner/:gistId"},
		{hostname: "gist.github.com", pathname: "/:owner/:gistId/*/:path"},
	];

	static defaults = {
		path: "data.json",
	};

	/**
	 * Parse Gist URLs, return username, gist id, filename
	 */
	static parseURL (source) {
		let ret = super.parseURL(source);

		if (ret.gistId === "NEW") {
			ret.gistId = undefined;
		}

		return ret;
	}
}
