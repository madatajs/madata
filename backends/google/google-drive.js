import Google from "./google.js";

export default class GoogleDrive extends Google {
	async get (file) {
		const call = `drive/v3/files/${file.id}?key=${this.apiKey}&alt=media`;

		try {
			return await this.request(call);
		}
		catch (e) {
			if (e.status === 401) {
				await this.logout(); // Access token we have is invalid. Discard it.
				throw new Error(this.constructor.phrase("access_token_invalid"));
			}

			if (e.status === 404) {
				// File might be private, but if the user is the file owner, the authenticated request will return it.
				return null;
			}
		}
	}

	async login (...args) {
		const user = await super.login(...args);

		if (user) {
			this.updatePermissions({edit: true, save: true});
		}

		return user;
	}

	static apiDomain = "https://www.googleapis.com/";
	static scopes = ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/userinfo.profile"];

	static test (url) {
		url = new URL(url);
		return url.host === "drive.google.com";
	}

	/**
	 * Parse Files URLs.
	 * @param {string} source File URL.
	 * @returns URL, ID.
	 */
	static parseURL (source) {
		const ret = {
			url: new URL(source)
		};

		const path = ret.url.pathname.slice(1).split("/");
		ret.id = path[2];

		return ret;
	}
}