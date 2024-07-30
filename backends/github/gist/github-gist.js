import Github from "../github.js";
import hooks from "../../../src/hooks.js";

/**
 * Github Gist backend.
 * @category GitHub
 */
export default class GithubGist extends Github {
	static capabilities = { auth: true, put: true };

	async get (ref = this.ref) {
		if (this.isAuthenticated()) {
			// Authenticated API call
			if (ref.gistId) {
				let data = await this.request(`gists/${ref.gistId}`, {}, "GET");
				let files = data.files;

				if (ref.path && (ref.path in files)) {
					return files[ref.path].content;
				}
				else {
					// Requested filename not found, just return the first file
					let gistFile = Object.values(files)[0];
					ref.path = gistFile.path;
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
			if (ref.path) {
				path = ref.path === GithubGist.defaults.path ? "" : ref.path + "/";
			}
			let url = new URL(`https://gist.githubusercontent.com/${ref.owner}/${ref.gistId}/raw/${path}`);
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

	async put (data, {ref = this.ref} = {}) {
		let call = "gists";
		let gistId = ref.gistId;

		if (gistId) {
			if (!this.canPush(ref)) {
				// Fork gist
				let gistInfo = await this.fork(ref);
				ref.owner = gistInfo.owner.login; // isn't this always this.username?
				ref.gistId = gistInfo.id;
			}

			call += "/" + this.info.gistId;
		}

		let gistInfo = await this.request(call, {
			files: {
				[ref.path]: {
					content: await this.stringify(data, {ref})
				}
			},
			public: true
		}, "POST");

		ref.gistId = gistInfo.id;
		ref.owner = gistInfo.owner.login;

		if (ref.gistId !== gistId) {
			// New gist created (or forked)
			let env = {context: this, ref};
			hooks.run("gh-new-gist", env);
		}

		return gistInfo;
	}

	async canPush (ref = this.ref) {
		// Just check if authenticated user is the same as our URL username
		// A gist can't have multiple collaborators
		return this.user && this.user.username.toLowerCase() == ref.owner.toLowerCase();
	}

	async fork (ref = this.ref) {
		return this.request(`gists/${ref.gistId}/forks`, {}, "POST");
	}

	static urls = [
		{hostname: "gist.github.com", pathname: "/:owner/:gistId{/raw}?"},
		{hostname: "gist.github.com", pathname: "/:owner/:gistId/*/:path"},
	];

	static urlsKnown = [
		{hostname: "gist.githubusercontent.com", pathname: "/:owner/:gistId/raw{/:revision}?/:path"},
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
