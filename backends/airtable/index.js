/**
 * @class Airtable
 * @extends OAuthBackend
 */
import OAuthBackend from "../../src/oauth-backend.js";

import { md5 } from "/lib/hash-wasm/dist/index.esm.min.js";

export default class Airtable extends OAuthBackend {
	/**
	 * Get records from a table.
	 * @param {Object} file A table to get records from.
	 * @returns {Array<Object> | null} An array of records from the table.
	 */
	async get (file = this.file) {
		const call = `${file.base}/${file.table}`;

		try {
			const records = [];
			let response = await this.request(call);
			records.push(...response.records);

			// Fetch the next pages of records (if any).
			while (response.offset) {
				const url = new URL(call, Airtable.apiDomain);
				const params = url.searchParams;
				params.set("offset", response.offset);

				response = await this.request(url);
				records.push(...response.records);
			}

			// Transform records to a more usable format (the way we do it in the CodaTable backend).
			return records.map(record => {
				let ret = record.fields;
				Object.defineProperty(ret, "__meta", {value: record, configurable: true, enumerable: false, writable: true});
				delete ret.__meta.fields;

				return ret;
			});
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

	async getUser () {
		if (this.user) {
			return this.user;
		}

		const info = await this.request("meta/whoami");

		// Since Airtable doesn't provide user-specific info except for ID and email (if the user allows),
		// we can try using Gravatar when possible.
		let user = {
			username: info.id,
			raw: info
		};

		if (info.email) {
			const hash = await md5(info.email);
			const profile = (await this.request(`https://en.gravatar.com/${hash}.json`))?.entry?.[0];
			if (profile) {
				user = {
					...user,
					username: profile.preferredUsername,
					name: profile.displayName,
					avatar: `${profile.thumbnailUrl}?size=256`,
					url: profile.profileUrl,
					email: info.email
				};
			}
		}

		return this.user = user;
	}

	async activeLogin () {
		let accessToken = prompt(this.constructor.phrase("login_prompt"));

		if (accessToken) {
			this.storeLocalUserInfo({accessToken});
		}
	}

	// oAuthParams () {
	// 	return `&redirect_uri=${this.constructor.authProvider}/&response_type=code&scope=${encodeURIComponent(Airtable.scopes.join(" "))}`;
	// }

	// static oAuth = "https://airtable.com/oauth2/v1/authorize";
	// static scopes = ["data.records:read", "data.records:write"];
	static apiDomain = "https://api.airtable.com/v0/";

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
		access_token_invalid: "Access token is invalid. Please, log in again.",
		login_prompt: "Enter your Airtable personal access token. You can find it in your personal access tokens panel at https://airtable.com/create/tokens."
	};
}