import Github from "./github.js";
import hooks from "../hooks.js";
import {readFile} from "../util.js";

export default class GithubRepos extends Github {
	update (url, o) {
		super.update(url, o);

		// Extract info for username, repo, branch, filepath from URL
		this.file = GithubRepos.parseURL(this.source, this.defaults);

		// If an author provided backend metadata, use them
		// since they have higher priority
		for (let part in this.file) {
			this.file[part] ??= GithubRepos.defaults[part];
		}

		this.repo = this.file.repo;
	}

	async get (url) {
		let file = url? GithubRepos.parseURL(url) : this.file;
		Object.assign({}, GithubRepos.defaults, file);

		if (this.isAuthenticated()) {
			let apiCall = `repos/${file.owner}/${file.repo}/contents/${file.path}`;
			let response = await this.request(apiCall, {ref: file.branch}, "GET", {
				headers: {
					"Accept": "application/vnd.github.squirrel-girl-preview"
				}
			});

			if (file.repo && response.content) {
				// Fetching file contents
				return atob(response.content);
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
	 async put (serialized, {path = this.path, isEncoded, ...o} = {}) {
		let repoCall = `repos/${this.file.owner}/${this.file.repo}`;
		let fileCall = `${repoCall}/contents/${path}`;
		let commitPrefix = this.options.commitPrefix || "";

		// Create repo if it doesn’t exist
		let repoInfo = this.repoInfo || await this.getRepoInfo();

		serialized = isEncoded? serialized : btoa(serialized);

		if (!this.canPush()) {
			// Does not have permission to commit, create a fork
			let forkInfo = await this.request(`${repoCall}/forks`, {name: this.file.repo}, "POST");

			fileCall = `repos/${forkInfo.full_name}/contents/${path}`;
			this.forkInfo = forkInfo;

			// Ensure that fork is created (they take a while)
			let timeout;
			let test = (resolve, reject) => {
				clearTimeout(timeout);
				this.request(`repos/${forkInfo.full_name}/commits`, {until: "1970-01-01T00:00:00Z"}, "HEAD")
					.then(x => {
						resolve(forkInfo);
					})
					.catch(x => {
						// Try again after 1 second
						timeout = setTimeout(test, 1000);
					});
			};

			repoInfo = new Promise(test);
		}

		try {
			let fileInfo = await this.request(fileCall, {
				ref: this.file.branch
			});

			fileInfo = this.request(fileCall, {
				message: commitPrefix + `Updated ${fileInfo.name || "file"}`,
				content: serialized,
				branch: this.file.branch,
				sha: fileInfo.sha
			}, "PUT");
		}
		catch (e) {
			if (xhr.status == 404) {
				// File does not exist, create it
				fileInfo = await this.request(fileCall, {
					message: commitPrefix + "Created file",
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
		let user = super.login(...args);

		this.updatePermissions({edit: true, save: true});

		if (this.file.repo) {
			// TODO move to load()?
			let repoInfo = this.getRepoInfo();

			if (this.file.branch === undefined) {
				this.file.branch = repoInfo.default_branch;
			}

			const env = { context: this, repoInfo };

			hooks.run("gh-after-login", env);

			this.repoInfo = env.repoInfo;
		}

		return user;
	}

	upload (file, path = this.path) {
		return readFile(file).then(dataURL => {
				let base64 = dataURL.slice(5); // remove data:
				let media = base64.match(/^\w+\/[\w+]+/)[0];
				media = media.replace("+", "\\+"); // Fix for #608
				base64 = base64.replace(RegExp(`^${media}(;base64)?,`), "");
				path = this.path.replace(/[^/]+$/, "") + path; // make upload path relative to existing path

				return this.put(base64, {path, isEncoded: true});
			})
			.then(fileInfo => this.getFileURL(path, {sha: fileInfo.commit.sha}));
	}

	canPush () {
		this.repoInfo ||= this.getRepoInfo();

		if (this.repoInfo) {
			return this.repoInfo.permissions.push;
		}

		// Repo does not exist yet so we can't check permissions
		// Just check if authenticated user is the same as our URL username
		// TODO if username is an org, check if user has repo creation permissions
		return this.user?.username?.toLowerCase() == this.file.owner.toLowerCase();
	}

	async getRepoInfo(repo = `${this.file.owner}/${this.file.repo}`) {
		// return this.request("user/repos", {name: this.file.repo}, "POST");
		return this.request(`repos/${repo}`);
	}

	/**
	 * Find forks of a repo by the current user
	 *
	 * @param {*} repo
	 * @memberof Github
	 */
	async getMyFork(repoInfo = this.repoInfo) {
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

	async getPagesInfo (repoInfo) {
		let repo = repoInfo.full_name;
		return repoInfo.pagesInfo = repoInfo.pagesInfo || this.request(`repos/${repo}/pages`, {}, "GET", {
			headers: {
				"Accept": "application/vnd.github.mister-fantastic-preview+json"
			}
		});
	}

	async getRepoURL (repoInfo = this.repoInfo, {
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
	async getFileURL (path = this.path, {repoInfo = this.repoInfo, ...options} = {}) {
		let repoURL = this.getRepoURL(repoInfo, options);

		if (!repoURL.endsWith("/")) {
			repoURL += "/";
		}

		return repoURL + path;
	}

	static defaults = {
		repo: "mv-data",
		filename: "data.json",
	}

	static test (url) {
		url = new URL(url, location);
		return /^(github\.com|raw\.githubusercontent\.com)/.test(url.host);
	}

	/**
	 * Parse Github URLs, return username, repo, branch, path
	 */
	 static parseURL (source) {
		const url = new URL(source, location);

		let path = url.pathname.slice(1).split("/");

		const ret = {
			owner: path.shift(),
			repo: path.shift(),
			branch: undefined,
			filepath: undefined,
			filename: undefined,
			path: undefined,
		};

		if (ret.repo) {
			// If we don't have a repo, we won't have a branch or a file path either
			if (!/raw.githubusercontent.com$/.test(url.host) && path[0] == "blob") {
				path.shift(); // drop "blob"
			}

			ret.branch = path.shift();

			ret.path = path.join("/");

			if (/\.\w+$/.test(url.pathname)) {
				// Last segment ends in .foo, so it's a file
				ret.filename = path.pop();
			}

			ret.filepath = path.join("/"); // what remains becomes the file path
		}

		return ret;
	}
}

// Fix atob() and btoa() so they can handle Unicode
function btoa (str) {
	return btoa(unescape(encodeURIComponent(str)));
}

function atob (str) {
	return decodeURIComponent(escape(window.atob(str)));
}