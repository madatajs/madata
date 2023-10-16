import Github from "../github.js";
// import hooks from "../../../src/hooks.js";

export default class GithubAPI extends Github {
	update (url, o) {
		super.update(url, o);

		Object.assign(this, GithubAPI.parseURL(this.source));
	}

	async get (file = this.file) {
		if (file.query) {
			// GraphQL
			let response = await this.request(file.url, { query: file.query }, "POST");
			if (response.errors?.length) {
				throw new Error(response.errors.map(x => x.message).join("\n"));
			}

			return response.data;
		}

		let req = {
			responseType: "response",
			headers: {
				"Accept": "application/vnd.github.squirrel-girl-preview"
			}
		};
		let response = await this.request(file.apiCall, {}, "GET", req);

		if (!response || !response.ok) {
			return null;
		}

		// Raw API call
		let json = await response.json();

		let params = new URL(file.apiCall, this.constructor.apiDomain).searchParams;
		let maxPages = params.get("max_pages") - 1; /* subtract 1 because we already fetched a page */

		if (maxPages > 0 && params.get("page") === null && Array.isArray(json)) {
			// Fetch more pages
			let next;

			do {
				next = response.headers.get("Link")?.match(/<(.+?)>; rel="next"/)?.[1];

				if (next) {
					response = await this.request(next, {}, "GET", req);

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

	static test (url) {
		url = new URL(url);
		return url.host === "api.github.com";
	}

	static parseURL (source) {
		let ret = {
			url: new URL(source)
		};

		if (ret.url.pathname == "/graphql") {
			if (ret.url.hash) {
				// https://api.github.com/graphql#query{...}
				ret.query = source.match(/#([\S\s]+)/)?.[1]; // url.hash drops line breaks
				ret.url.hash = "";
			}
			else {
				ret.query = "";
			}
		}
		else {
			// Raw API call
			ret.apiCall = ret.url.pathname.slice(1) + ret.url.search;
		}

		return ret;
	}
}