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

	async put (serialized, {file} = {}) {
		if (!file.info) {
			file.info = await this.getFileInfo(file);
		}
		
		if (!file.info.ownedByMe && file.info.capabilities.canCopy && !file.info.copyRequiresWriterPermission) {
			if (this.options.allowCopying) {
				const fileInfo = await this.copyFile(file);

				file = GoogleDrive.parseURL(fileInfo.webViewLink);
				file.info = fileInfo;
			}
			else {
				throw new Error(this.constructor.phrase("no_write_permission", file.url.href));
			}
		}

		const call = `upload/drive/v3/files/${file.id}?key=${this.apiKey}&uploadType=multipart`;

		return await this.request(call, serialized, "PATCH");
	}

	async login (...args) {
		const user = await super.login(...args);

		if (user) {
			this.updatePermissions({edit: true, save: true});
		}

		return user;
	}

	async copyFile (file) {
		const call = `drive/v3/files/${file.id}/copy?fields=${file.fields}`;

		return await this.request(call, {}, "POST");
	}

	async getFileInfo (file = this.file) {
		const call = `drive/v3/files/${file.id}?key=${this.apiKey}&fields=${file.fields}`;
		return await this.request(call);
	}

	static apiDomain = "https://www.googleapis.com/";
	static scopes = ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/userinfo.profile"];

	static test (url) {
		url = new URL(url);
		return url.host === "drive.google.com";
	}

	static defaults = {
		fields: "name, id, webViewLink, capabilities, copyRequiresWriterPermission, ownedByMe"
	}

	static phrases = {
		"no_write_permission": (file) => `You do not have permission to write to file ${file}.`,
	}

	/**
	 * Parse Files URLs.
	 * @param {string} source File URL.
	 * @returns URL, ID.
	 */
	static parseURL (source) {
		const ret = {
			url: new URL(source),
			fields: undefined
		};

		const path = ret.url.pathname.slice(1).split("/");
		ret.id = path[2];

		// Apply defaults.
		for (const part in ret) {
			if (ret[part] === undefined && part in GoogleDrive.defaults) {
				ret[part] = GoogleDrive.defaults[part];
			}
		}

		return ret;
	}
}