import Github from "../github.js";
// import hooks from "../../../src/hooks.js";

/**
 * Backend for performing raw API calls with the REST or GraphQL API to GitHub repositories.
 * @category GitHub
 */
export default class GithubAPI extends Github {
	update (url, o) {
		super.update(url, o);

		Object.assign(this, GithubAPI.parseURL(this.source));
	}

	async get (ref = this.ref) {
		if (ref.query) {
			// GraphQL
			let response = await this.request(ref.url, { query: ref.query }, "POST");
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
		let response = await this.request(ref.apiCall, {}, "GET", req);

		if (!response || !response.ok) {
			return null;
		}

		// Raw API call
		let json = await response.json();

		let params = new URL(ref.apiCall, this.constructor.apiDomain).searchParams;
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

	static urls = [
		{hostname: "api.github.com", pathname: "/graphql", hash:":query?"},
		{hostname: "api.github.com", pathname: "/:apiCall(.+)"}, // Order matters: all API calls that are not GraphQL will be raw API calls
	];

	static parseURL (source) {
		let ret = super.parseURL(source);

		if (ret.apiCall) {
			// Raw API call
			ret.apiCall += ret.url.search;
		}
		else if (ret.query) {
			// GraphQL
			ret.query = source.match(/#([\S\s]+)/)?.[1]; // Why? url.hash drops line breaks
			ret.url.hash = "";
		}

		return ret;
	}
}