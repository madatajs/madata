/**
 * @class GithubFile
 * @extends Github
 */
import Github from "./github.js";
import hooks from "../../src/hooks.js";
import {readFile, delay} from "../../src/util.js";

export default class GithubFile extends Github {
	/**
	 * Low-level method to fetch a file from GitHub
	 * @param {Object} file
	 * @returns {string} File contents as a string, or `null` if not found
	 */
	async get (file) {
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

			if (file.repo && response?.content) {
				// Fetching file contents
				return fromBase64(response.content);
			}
			else {
				return response;
			}
		}
		else {
			// Unauthenticated, use simple GET request to avoid rate limit
			let url = new URL(`https://raw.githubusercontent.com/${file.owner}/${file.repo}/${file.branch || "main"}/${file.path}`);
			url.searchParams.set("timestamp", Date.now()); // ensure fresh copy

			let response = await fetch(url.href);

			if (response.ok) {
				file.branch = file.branch || "main";
				return response.text();
			}
			else {
				if (response.status === 404 && !file.branch) {
					// Possibly using older default branch "master", try again and store branch name
					url.pathname = `/${file.owner}/${file.repo}/master/${file.path}`;
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

	static sameRepo (file1, file2) {
		if (file1 === file2) {
			return true;
		}

		return file1.owner === file2.owner && file1.repo === file2.repo;
	}

	/**
	 * Saves a file to the backend.
	 * @param {String} serialized - Serialized data
	 * @param {String} path - Optional file path
	 * @return {Promise} A promise that resolves when the file is saved.
	 */
	async put (serialized, {file, isEncoded} = {}) {
		return this.#write("put", file, serialized, {isEncoded});
	}

	async delete (file = this.file) {
		return this.#write("delete", file);
	}

	async #write (type, file, ...args) {
		if (file.repoInfo === undefined) {
			file.repoInfo = await this.getRepoInfo(file);
		}

		if (file.repoInfo === null) {
			// Create repo if it doesn’t exist
			file.repoInfo = await this.createRepo(file.repo);
		}

		// Update this.file.repoInfo too
		if (!this.file.repoInfo && GithubFile.sameRepo(file, this.file)) {
			this.file.repoInfo = file.repoInfo;
		}

		if ((await this.canPush(file)) === false) {
			if (this.options.allowForking) {
				// Does not have permission to commit, create a fork
				let forkInfo = await this.fork(file);

				file.forked = true;
				file.original = Object.assign({}, file);
				file.owner = forkInfo.owner.login;
				file.repo = forkInfo.name;
				file.repoInfo = forkInfo;
			}
			else {
				throw new Error(this.constructor.phrase("no_push_permission", `${file.owner}/${file.repo}`));
			}
		}

		let fileInfo;
		let fileCall = `repos/${file.owner}/${file.repo}/contents/${file.path}`;
		let commitPrefix = this.options.commitPrefix || "";

		// Read file, so we can get a SHA
		fileInfo = await this.request(fileCall, {
			ref: file.branch
		});

		if (type === "put") {
			let [serialized, {isEncoded} = {}] = args;

			serialized = isEncoded? serialized : toBase64(serialized);

			if (fileInfo !== null) {
				// Write file
				fileInfo = await this.request(fileCall, {
					message: commitPrefix + this.constructor.phrase("updated_file", file.path),
					content: serialized,
					branch: file.branch,
					sha: fileInfo.sha
				}, "PUT");
			}
			else {
				// File doesn't exist yet, create it
				fileInfo = await this.request(fileCall, {
					message: commitPrefix + this.constructor.phrase("created_file", file.path),
					content: serialized,
					branch: file.branch
				}, "PUT");
			}
		}
		else if (type === "delete") {

			if (fileInfo !== null) {
				console.log(fileCall, fileInfo, fileInfo.sha);
				// Delete file
				fileInfo = await this.request(fileCall, {
					message: commitPrefix + this.constructor.phrase("deleted_file", file.path),
					branch: file.branch,
					sha: fileInfo.sha
				}, "DELETE");
			}
		}

		const env = {context: this, fileInfo, type};

		hooks.run("gh-after-commit", env);

		return env.fileInfo;
	}

	async login (...args) {
		let user = await super.login(...args);

		if (user) {
			this.updatePermissions({edit: true, save: true});

			if (!this.file.owner) {
				Object.defineProperty(this.file, "owner", {
					get: () => this.user.username,
					set: (value) => {
						console.log(`setting owner from ${this.user.username} to ${value}`);
						delete this.file.owner;
						this.file.owner = value;
					},
					configurable: true,
					enumerable: true,
				});
			}

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
		if (typeof file === "string") {
			file = this.constructor.parseURL(file);
		}

		if (file.repoInfo === undefined) {
			file.repoInfo = await this.getRepoInfo(file);
		}

		if (file.repoInfo) {
			return file.repoInfo.permissions?.push;
		}

		// Repo does not exist yet so we can't check permissions
		// Just check if authenticated user is the same as our URL username
		// TODO if username is an org, check if user has repo creation permissions
		return this.user?.username?.toLowerCase() == file.owner.toLowerCase();
	}

	async createRepo (name, options = {}) {
		// TODO what if the repo is in an organization?
		return this.request("user/repos", {name, private: this.options.private === true, ...options}, "POST");
	}

	async getRepoInfo(file = this.file) {
		let repoInfo;

		// Is the repo the same as the main repo?
		if (file !== this.file && this.file.repoInfo && file.owner === this.file.owner && file.repo === this.file.repo) {
			repoInfo = this.file.repoInfo;
		}
		else {
			if (file.owner && file.repo) {
				repoInfo = await this.request(`repos/${file.owner}/${file.repo}`);
			}
			else {
				throw new Error("Cannot get repo info, owner and/or repo name missing.", file);
			}
		}

		if (repoInfo && file.branch === undefined) {
			file.branch = repoInfo.default_branch;
		}

		return repoInfo;
	}

	/**
	 * Find forks of a repo by the current user
	 *
	 * @param {Object} repoInfo
	 * @returns {Object} repoInfo object about the fork or null
	 */
	async getMyFork(repoInfo = this.file.repoInfo) {
		let myRepoCount = this.user.public_repos + this.user.total_private_repos;

		if (myRepoCount < repoInfo.forks) {
			// Search which of this user's repos is a fork of the repo in question
			let query = `query {
				viewer {
					name
						repositories(last: 100, isFork: true) {
						nodes {
							nameWithOwner
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
					let [owner, repo] = repos[i].nameWithOwner.split("/");
					return this.getRepoInfo({owner, repo});
				}
			}
		}
		else {
			// Search which of the forks of the repo in question belongs to the current user
			let forks = await this.request(repoInfo.forks_url);

			for (let fork of forks) {
				if (fork.owner.login === this.user.username) {
					return fork;
				}
			}
		}

		return null;
	}

	/**
	 * Fork a repo, or return a fork if one already exists
	 * @param [file]
	 * @param {options} [options]
	 * @param [options.force=false] {Boolean} Force a new repo to be created. If false, will try to find an existing fork of the repo.
	 * @returns
	 */
	async fork (file = this.file, {force = false} = {}) {
		let repoCall = `repos/${file.repoInfo.full_name}`;

		if (!force) {
			// Check if we have an existing fork
			let forkInfo = await this.getMyFork(file.repoInfo);

			if (forkInfo) {
				return forkInfo;
			}
		}

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

	async publish (file = this.file, {https_enforced = true} = {}) {
		let source = {
			branch: file.branch || "main",
		}

		let pagesInfo = await this.request(`repos/${file.owner}/${file.repo}/pages`, {source}, "POST", {
			headers: {
				"Accept": "application/vnd.github+json",
			}
		});

		if (https_enforced) {
			await this.request(`repos/${file.owner}/${file.repo}/pages`, {https_enforced: true}, "PUT", {
				headers: {
					"Accept": "application/vnd.github.v3+json",
				}
			});
		}

		return pagesInfo;
	}

	async getPagesInfo (file = this.file) {
		let repoInfo = await this.getRepoInfo(file);

		if (repoInfo) {
			let repo = repoInfo.full_name;
			return repoInfo.pagesInfo = repoInfo.pagesInfo || this.request(`repos/${repo}/pages`, {}, "GET", {
				headers: {
					"Accept": "application/vnd.github+json",
				}
			});
		}
	}

	async getRepoURL (file = this.file, {
		sha = file.branch || "latest",
	} = {}) {
		if (this.options.repoURL) {
			return this.options.repoURL;
		}

		try {
			let pagesInfo = await this.getPagesInfo(file);

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
		"deleted_file": (name = "file") => "Deleted " + name,
		"no_push_permission": (repo) => `You do not have permission to write to repository ${repo}`,
	}

	static test (url) {
		url = new URL(url, location);
		return ["github.com", "raw.githubusercontent.com"].includes(url.host);
	}

	/**
	 * Parse Github URLs, return username, repo, branch, path
	 */
	static parseURL (source) {
		const ret = {
			owner: undefined,
			repo: undefined,
			branch: undefined,
			path: undefined,
		};

		if (!source) {
			return ret;
		}

		const url = new URL(source);

		let path = url.pathname.slice(1).split("/");

		ret.owner = path.shift();
		ret.repo = path.shift();

		if (ret.repo) { // If we don't have a repo, we won't have a branch or a file path either
			let hasBranch = url.host === "raw.githubusercontent.com" || path[0] === "blob";

			if (url.host !== "raw.githubusercontent.com" && path[0] === "blob") {
				path.shift(); // drop "blob"
			}

			if (hasBranch) {
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