import OAuthBackend from "../oauth-backend.js";
import hooks from "../hooks.js";
import {readFile} from "../util.js";

export default class Github extends OAuthBackend {
	id = "Github"

	constructor (url, o) {
		super(url, o);

		this.updatePermissions({ read: true });
	}

	update (url, o) {
		super.update(url, o);

		// Extract info for username, repo, branch, filepath from URL
		let extension = o.extension || ".json";

		this.defaults = {
			repo: "mv-data",
			filename: o.filename || "data" + extension,
		};

		this.info = Github.parseURL(this.source, this.defaults);

		// If an author provided backend metadata, use them
		// since they have higher priority
		for (const prop in o) {
			if (this.info.apiCall === "graphql" && prop === "query") {
				// It makes sense to set/update the apiData property only for calls with GraphQL.
				// Otherwise, it will break the Github#get method.
				this.info.apiData = { query: o.query };

				continue;
			}

			this.info[prop] = o[prop];
		}

		Object.assign(this, this.info);
	}

	async get (url) {
		if (this.isAuthenticated() || !this.path || url) {
			// Authenticated or raw API call
			let info = url? Github.parseURL(url) : this.info;

			if (info.apiData) {
				// GraphQL
				return this.request(info.apiCall, info.apiData, "POST")
					.then(response => {
						if (response.errors?.length) {
							return Promise.reject(response.errors.map(x => x.message).join("\n"));
						}

						return response.data;
					});
			}

			let isRawAPICall = info.apiParams !== undefined;
			let responseType = isRawAPICall ? "response" : "json";
			let req = {
				responseType,
				headers: {
					"Accept": "application/vnd.github.squirrel-girl-preview"
				}
			};
			let response = await this.request(info.apiCall, {ref:this.branch}, "GET", req);

			if (isRawAPICall) {
				// Raw API call
				let json = await response.json();

				let params = new URL(info.apiCall, this.constructor.apiDomain).searchParams;
				let maxPages = params.get("max_pages") - 1; /* subtract 1 because we already fetched a page */

				if (maxPages > 0 && params.get("page") === null && Array.isArray(json)) {
					// Fetch more pages
					let next;

					do {
						next = response.headers.get("Link")?.match(/<(.+?)>; rel="next"/)?.[1];

						if (next) {
							response = await this.request(next, {ref:this.branch}, "GET", req);

							if (response.ok) {
								let pageJSON = await response.json();

								if (Array.isArray(pageJSON)) {
									json.push(...pageJSON);
								}
								else {
									break;
								}
							}
							else {
								break;
							}
						}
						else {
							break;
						}

					} while (--maxPages > 0);

				}

				return json;

			}
			else {
				if (info.repo && response.content) {
					// Fetching file contents
					return Github.atob(response.content);
				}
				else {
					return response;
				}
			}
		}
		else {
			// Unauthenticated, use simple GET request to avoid rate limit
			url = new URL(`https://raw.githubusercontent.com/${this.username}/${this.repo}/${this.branch || "main"}/${this.path}`);
			url.searchParams.set("timestamp", Date.now()); // ensure fresh copy

			let response = await fetch(url.href);

			if (response.ok) {
				this.branch = this.branch || "main";
				return response.text();
			}
			else {

				if (response.status === 404 && !this.branch) {
					// Possibly using older default branch "master", try again and store branch name
					url.pathname = `/${this.username}/${this.repo}/master/${this.path}`;
					response = await fetch(url.href);

					if (response.ok) {
						this.branch = "master";
						return response.text();
					}
				}
			}

			return null;
		}
	}

	upload (file, path = this.path) {
		return readFile(file).then(dataURL => {
				let base64 = dataURL.slice(5); // remove data:
				let media = base64.match(/^\w+\/[\w+]+/)[0];
				media = media.replace("+", "\\+"); // Fix for #608
				base64 = base64.replace(RegExp(`^${media}(;base64)?,`), "");
				path = this.path.replace(/[^/]+$/, "") + path; // make upload path relative to existing path

				return this.put(base64, path, {isEncoded: true});
			})
			.then(fileInfo => this.getFileURL(path, {sha: fileInfo.commit.sha}));
	}

	/**
	 * Saves a file to the backend.
	 * @param {String} serialized - Serialized data
	 * @param {String} path - Optional file path
	 * @return {Promise} A promise that resolves when the file is saved.
	 */
	async put (serialized, path = this.path, o = {}) {
		if (!path) {
			// Raw API calls are read-only for now
			return;
		}

		let repoCall = `repos/${this.username}/${this.repo}`;
		let fileCall = `${repoCall}/contents/${path}`;
		let commitPrefix = this.mavo.element.getAttribute("mv-github-commit-prefix") || "";

		// Create repo if it doesn’t exist
		let repoInfo = this.repoInfo || await this.getRepoInfo();

		serialized = o.isEncoded? serialized : Github.btoa(serialized);

		if (!this.canPush()) {
			// Does not have permission to commit, create a fork
			let forkInfo = await this.request(`${repoCall}/forks`, {name: this.repo}, "POST");

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
				ref: this.branch
			});

			fileInfo = this.request(fileCall, {
				message: commitPrefix + `Updated ${fileInfo.name || "file"}`,
				content: serialized,
				branch: this.branch,
				sha: fileInfo.sha
			}, "PUT");
		}
		catch (e) {
			if (xhr.status == 404) {
				// File does not exist, create it
				fileInfo = await this.request(fileCall, {
					message: commitPrefix + "Created file",
					content: serialized,
					branch: this.branch
				}, "PUT");
			}
		}

		const env = {context: this, fileInfo};

		hooks.run("gh-after-commit", env);

		return env.fileInfo;
	}

	async getRepoInfo(repo = `${this.username}/${this.repo}`) {
		// return this.request("user/repos", {name: this.repo}, "POST");
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

	async login ({passive = false} = {}) {
		let user = super.login({passive});

		this.updatePermissions({edit: true, save: true});

		if (this.repo) {
			// TODO move to load()?
			let repoInfo = this.getRepoInfo();

			if (this.branch === undefined) {
				this.branch = repoInfo.default_branch;
			}

			const env = { context: this, repoInfo };

			hooks.run("gh-after-login", env);

			this.repoInfo = env.repoInfo;
		}

		return user;
	}

	canPush () {
		this.repoInfo ||= this.getRepoInfo();

		if (this.repoInfo) {
			return this.repoInfo.permissions.push;
		}

		// Repo does not exist yet so we can't check permissions
		// Just check if authenticated user is the same as our URL username
		// TODO if username is an org, check if user has repo creation permissions
		return this.user?.username?.toLowerCase() == this.username.toLowerCase();
	}

	oAuthParams = () => "&scope=repo"

	async getUser () {
		if (this.user) {
			return this.user;
		}

		let info = await this.request("user");

		return this.user = {
			username: info.login,
			name: info.name || info.login,
			avatar: info.avatar_url,
			url: "https://github.com/" + info.login,
			...info
		};
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
		sha = this.branch || "latest",
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

	static apiDomain = "https://api.github.com/"
	static oAuth = "https://github.com/login/oauth/authorize"
	static key = "7e08e016048000bc594e"

	static defaults = {
		repo: "mv-data",
		filename: "data.json"
	}

	static test (url) {
		url = new URL(url, location);
		return /^((api\.)?github\.com|raw\.githubusercontent\.com)/.test(url.host);
	}

	/**
	 * Parse Github URLs, return username, repo, branch, path
	 */
	static parseURL (source, defaults = {}) {
		const ret = {};

		// Define computed properties as writable accessors
		Object.defineProperties(ret, {
			"apiCall": {
				get() {
					let call = `repos/${this.username}/${this.repo}/${this.resources ?? "contents"}`;

					const path = this.path;
					if (path) {
						call += `/${path}`;
					}

					// Don't lose search params for raw API calls
					return call + (this.apiParams ?? "");
				},
				set (v) {
					delete this.apiCall;
					this.apiCall = v;
				},
				configurable: true,
				enumerable: true
			},

			"path": {
				get() {
					if (this.filename) {
						return (this.filepath? this.filepath + "/" : "") + this.filename;
					}
					else {
						return this.filepath;
					}
				},
				set (v) {
					delete this.path;
					this.path = v;
				},
				configurable: true,
				enumerable: true
			}
		});

		const url = new URL(source, defaults.urlBase);
		let path = url.pathname.slice(1).split("/");

		ret.username = path.shift();
		ret.repo = path.shift() || defaults.repo;

		if (/raw.githubusercontent.com$/.test(url.host)) {
			ret.branch = path.shift();
		}
		else if (/api.github.com$/.test(url.host)) {
			// Raw API call
			delete ret.username;
			delete ret.repo;

			ret.apiParams = url.search;
			ret.apiData = source.match(/#([\S\s]+)/)?.[1]; // url.hash drops line breaks

			const apiCall = url.pathname.slice(1) + ret.apiParams;

			if (apiCall == "graphql") {
				ret.apiCall = apiCall;
				ret.apiData = { query: ret.apiData };

				return ret;
			}

			path = url.pathname.slice(1).split("/");
			const firstSegment = path.shift();

			if (firstSegment != "repos") {
				ret.apiCall = apiCall;

				return ret;
			}

			ret.username = path.shift();
			ret.repo = path.shift();
			ret.resources = path.shift();
		}
		else if (path[0] == "blob") {
			path.shift();
			ret.branch = path.shift();
		}

		const lastSegment = path[path.length - 1];

		if (/\.\w+$/.test(lastSegment)) {
			ret.filename = lastSegment;
			path.splice(path.length - 1, 1);
		}
		else {
			// If we work with a raw API call and couldn't find the filename in the path,
			// leave the filename blank
			ret.filename = ret.hasOwnProperty("apiParams")? "" : defaults.filename;
		}

		ret.filepath = path.join("/") || defaults.filepath || "";

		return ret;
	}

	// Fix atob() and btoa() so they can handle Unicode
	static btoa = str => btoa(unescape(encodeURIComponent(str)))
	static atob = str => decodeURIComponent(escape(window.atob(str)))
}