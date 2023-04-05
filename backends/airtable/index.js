/**
 * @class Airtable
 * @extends OAuthBackend
 */
import OAuthBackend from "../../src/oauth-backend.js";

export default class Airtable extends OAuthBackend {
	/**
	 * Get records from a table.
	 * @param {Object} file A table to get records from.
	 * @returns {Array<Object> | null} An array of records from the table.
	 */
	async get (file) {
		const call = `${file.base}/${file.table}`;

		try {
			const ret = [];
			let response = await this.request(call);
			ret.push(...response.records);

			// Fetch the next pages of records (if any).
			while (response.offset) {
				const url = new URL(call, Airtable.apiDomain);
				const params = url.searchParams;
				params.set("offset", response.offset);

				response = await this.request(url);
				ret.push(...response.records);
			}

			return ret;
		}
		catch (e) {
			if (e.status === 401) {
				await this.logout(); // Access token we have is invalid. Discard it.
				throw new Error(this.constructor.phrase("access_token_invalid"));
			}

			if (e.status === 404) {
				return null;
			}

			let error;
			if (e instanceof Response) {
				error = (await e.json()).error.message;
			}
			else {
				error = e.message;
			}

			throw new Error(error);
		}
	}

	oAuthParams () {
		return `&redirect_uri=${this.constructor.authProvider}/&response_type=code&scope=${encodeURIComponent(Airtable.scopes.join(" "))}`;
	}

	static oAuth = "https://airtable.com/oauth2/v1/authorize";
	static apiDomain = "https://api.airtable.com/v0/";
	static scopes = ["data.records:read", "data.records:write"];

	static test (url) {
		url = new URL(url, location);
		return url.host === "airtable.com";
	}

	/**
	 * Parse tables URLs.
	 * @param {string} source Table URL.
	 * @returns Base ID, table ID.
	 */
	static parseURL (source) {
		const ret = {
			url: new URL(source)
		};

		const path = ret.url.pathname.slice(1).split("/");

		ret.base = path.shift();
		ret.table = path.shift();

		return ret;
	}

	static phrases = {
		access_token_invalid: "Access token is invalid. Please, log in again."
	};
}