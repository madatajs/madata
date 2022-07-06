import Github from "./github.js";
import hooks from "../../src/hooks.js";
import {readFile, delay} from "../../src/util.js";

export default class GithubFile extends Github {
	async get (url) {
		let file = url? this.constructor.parseURL(url) : this.file;

		if (this.isAuthenticated()) {
			let call = `repos/${file.owner}/${file.repo}/contents/${file.path}`;

			let response;

			try {
				response = await this.request(call, {ref: file.branch}, "GET", {
					headers: {
						"Accept": "application/vnd.github.squirrel-girl-preview"
					}
				});
			}
			catch (err) {
				if (err.status === 404) {
					return null;
				}
			}

			if (file.repo && response.content) {
				// Fetching file contents
				return fromBase64(response.content);
			}
			else {
				return response;
			}
		}
		else {
			// Unauthenticated, use simple GET request to avoid rate limit
			url = new URL(`https://raw.githubusercontent.com/${file.username}/${file.repo}/${file.branch || "main"}/${file.path}`);
			url.searchParams.set("timestamp", Date.now()); // ensure fresh copy

			let response = await fetch(url.href);

			if (response.ok) {
				file.branch = file.branch || "main";
				return response.text();
			}
			else {
				if (response.status === 404 && !file.branch) {
					// Possibly using older default branch "master", try again and store branch name
					url.pathname = `/${file.username}/${file.repo}/master/${file.path}`;
					response = await fetch(url.href);

					if (response.ok) {
						file.branch = "master";
						return response.text();
					}
				}
			}

			return null;
		}
	}

	/**
	 * Saves a file to the backend.
	 * @param {String} serialized - Serialized data
	 * @param {String} path - Optional file path
	 * @return {Promise} A promise that resolves when the file is saved.
	 */
	 async put (serialized, {file = this.file, path, isEncoded, ...o} = {}) {
		let commitPrefix = this.options.commitPrefix || "";

		if (path) {
			file = Object.assign({}, file, {path});
		}

		if (!file.repoInfo) {
			file.repoInfo = await this.getRepoInfo(file);

			if (!file.repoInfo) {
				// Create repo if it doesn’t exist
				file.repoInfo = await this.createRepo(this.file.repo)
			}
		}

		let fileCall = `repos/${file.owner}/${file.repo}/contents/${file.path}`;

		if (this.canPush(file) === false) {
			// Does not have permission to commit, create a fork
			let forkInfo = await this.fork(file);

			fileCall = `repos/${forkInfo.full_name}/contents/${file.path}`;
			file.forkInfo = forkInfo;
		}

		serialized = isEncoded? serialized : toBase64(serialized);

		let fileInfo;

		try {
			fileInfo = await this.request(fileCall, {
				ref: this.file.branch
			});

			fileInfo = await this.request(fileCall, {
				message: commitPrefix + this.constructor.phrase("updated_file", fileInfo.name || file.path),
				content: serialized,
				branch: this.file.branch,
				sha: fileInfo.sha
			}, "PUT");
		}
		catch (err) {
			if (err.status == 404) {
				// File does not exist, create it
				fileInfo = await this.request(fileCall, {
					message: commitPrefix + this.constructor.phrase("created_file", file.path),
					content: serialized,
					branch: this.file.branch
				}, "PUT");
			}
		}

		const env = {context: this, fileInfo};

		hooks.run("gh-after-commit", env);

		return env.fileInfo;
	}

	async login (...args) {
		let user = await super.login(...args);

		if (user) {
			this.updatePermissions({edit: true, save: true});

			if (this.file.repo) {
				// TODO move to load()?
				this.file.repoInfo = await this.getRepoInfo();
			}
		}

		return user;
	}

	async upload (file, path = this.path) {
		let dataURL = await readFile(file);

		let base64 = dataURL.slice(5); // remove data:
		let media = base64.match(/^\w+\/[\w+]+/)[0];
		media = media.replace("+", "\\+"); // Fix for #608
		base64 = base64.replace(RegExp(`^${media}(;base64)?,`), "");
		path = this.path.replace(/[^/]+$/, "") + path; // make upload path relative to existing path

		let fileInfo = await this.put(base64, {path, isEncoded: true});
		return this.getFileURL(path, {sha: fileInfo.commit.sha});
	}

	async canPush (file = this.file) {
		if (!file.repoInfo) {
			file.repoInfo = await this.getRepoInfo(file);
		}

		if (file.repoInfo) {
			return file.repoInfo.permissions.push;
		}

		// Repo does not exist yet so we can't check permissions
		// Just check if authenticated user is the same as our URL username
		// TODO if username is an org, check if user has repo creation permissions
		return this.user?.username?.toLowerCase() == file.owner.toLowerCase();
	}

	async createRepo (name, options = {}) {
		// TODO what if the repo is in an organization?
		return this.request("user/repos", {name, ...options}, "POST");
	}

	async getRepoInfo(file = this.file) {
		let repoInfo;

		// Is the repo the same as the main repo?
		if (file !== this.file && this.file.repoInfo && file.owner === this.file.owner && file.repo === this.file.repo) {
			repoInfo = this.file.repoInfo;
		}
		else {
			repoInfo = await this.request(`repos/${file.owner}/${file.repo}`);
		}

		if (file.branch === undefined) {
			file.branch = repoInfo.default_branch;
		}

		return repoInfo;
	}

	/**
	 * Find forks of a repo by the current user
	 *
	 * @param {Object} repoInfo
	 * @memberof Github
	 */
	async getMyFork(repoInfo = this.file.repoInfo) {
		let myRepoCount = this.user.public_repos + this.user.total_private_repos;

		if (myRepoCount < repoInfo.forks) {
			// Search which of this user's repo is a fork of the repo in question
			let query = `query {
				viewer {
					name
						repositories(last: 100, isFork: true) {
						nodes {
							url
							parent {
								nameWithOwner
							}
						}
					}
				}
			}`;
			let data = await this.request("https://api.github.com/graphql", {query: query}, "POST")

			let repos = data.data.viewer.repositories.nodes;

			for (let i in repos) {
				if (repos[i].parent.nameWithOwner === repoInfo.full_name) {
					return repos[i].url;
				}
			}
		}
		else {
			// Search which of the forks of the repo in question belongs to the current user
			let forks = await this.request(repoInfo.forks_url);

			for (let fork of forks) {
				if (fork.owner.login === this.user.username) {
					return fork.html_url;
				}
			}
		}
	}

	async fork (file = this.file) {
		let repoCall = `repos/${file.owner}/${file.repo}`;

		// Does not have permission to commit, create a fork
		// FIXME what if I already have a repo with that name?
		let forkInfo = await this.request(`${repoCall}/forks`, {name: file.repo}, "POST");

		// Ensure that fork is created (they take a while) by requesting commits every second up to 5 minutes
		for (let i = 0; i < 300; i++) {
			try {
				await this.request(`repos/${forkInfo.full_name}/commits`, {until: "1970-01-01T00:00:00Z"}, "HEAD")
			}
			catch (err) {
				await delay(1000);
			}
		}

		return forkInfo;
	}

	async getPagesInfo (repoInfo) {
		let repo = repoInfo.full_name;
		return repoInfo.pagesInfo = repoInfo.pagesInfo || this.request(`repos/${repo}/pages`, {}, "GET", {
			headers: {
				"Accept": "application/vnd.github.mister-fantastic-preview+json"
			}
		});
	}

	async getRepoURL (repoInfo = this.file.repoInfo, {
		sha = this.file.branch || "latest",
	} = {}) {
		if (this.options.repoURL) {
			return this.options.repoURL;
		}

		try {
			let pagesInfo = await this.getPagesInfo(repoInfo);

			if (pagesInfo) {
				return pagesInfo.html_url;
			}
		}
		catch(e) {}

		return `https://cdn.jsdelivr.net/gh/${repoInfo.full_name}@${sha}/`
	}

	/**
	 * Get a public URL for a file in a repo
	 */
	async getFileURL (path = this.path, {repoInfo = this.file.repoInfo, ...options} = {}) {
		let repoURL = this.getRepoURL(repoInfo, options);

		if (!repoURL.endsWith("/")) {
			repoURL += "/";
		}

		return repoURL + path;
	}

	static defaults = {
		repo: "mv-data",
		path: "data.json",
	}

	static phrases = {
		"updated_file": (name = "file") => "Updated " + name,
		"created_file": (name = "file") => "Created " + name,
	}

	static test (url) {
		url = new URL(url, location);
		return ["github.com", "raw.githubusercontent.com"].includes(url.host);
	}

	/**
	 * Parse Github URLs, return username, repo, branch, path
	 */
	 static parseURL (source) {
		const url = new URL(source);

		let path = url.pathname.slice(1).split("/");

		const ret = {
			owner: path.shift(),
			repo: path.shift(),
			branch: undefined,
			path: undefined,
		};

		if (ret.repo) {
			// If we don't have a repo, we won't have a branch or a file path either
			if (!/raw.githubusercontent.com$/.test(url.host) && path[0] == "blob") {
				path.shift(); // drop "blob"
				ret.branch = path.shift();
			}

			ret.path = path.join("/");
		}

		// Apply defaults
		for (let part in ret) {
			if (ret[part] === undefined && part in this.defaults) {
				ret[part] = this.defaults[part];
			}
		}

		return ret;
	}
}

// Fix atob() and btoa() so they can handle Unicode
function toBase64 (str) {
	return btoa(unescape(encodeURIComponent(str)));
}

function fromBase64 (str) {
	return decodeURIComponent(escape(window.atob(str)));
}