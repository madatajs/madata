import Github from "./github.js";
import hooks from "../../src/hooks.js";

export default class GithubAPI extends Github {
	update (url, o) {
		super.update(url, o);

		Object.assign(this, GithubAPI.parseURL(this.source));
	}

	async get (url) {
		let call = url? GithubAPI.parseURL(url) : this.file;

		if (call.query) {
			// GraphQL
			let response = await this.request(call.url, { query: call.query }, "POST");
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
		let response = await this.request(call.apiCall, {}, "GET", req);

		// Raw API call
		let json = await response.json();

		let params = new URL(call.apiCall, this.constructor.apiDomain).searchParams;
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
		url = new URL(url, location);
		return url.host === "api.github.com";
	}

	static parseURL (source) {
		let ret = {
			url: new URL(source, location)
		};

		if (ret.url.hash && ret.url.pathname == "/graphql") {
			// https://api.github.com/graphql#query{...}
			ret.query = source.match(/#([\S\s]+)/)?.[1]; // url.hash drops line breaks
			ret.url.hash = "";
		}
		else {
			// Raw API call
			ret.apiCall = ret.url.pathname.slice(1) + ret.url.search;
		}

		return ret;
	}
}