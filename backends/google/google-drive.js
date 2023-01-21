/**
 * @class GoogleDrive
 * @extends Google
 */
import Google from "./google.js";

export default class GoogleDrive extends Google {
	update (url, o = {}) {
		super.update(url, o);

		if (o.folder) {
			const folderId = GoogleDrive.#getFolderId(o.folder);

			if (!folderId) {
				delete this.file.folder;
				return;
			}

			this.file.folderId = folderId;
		}

		if (o.fields) {
			// We don't want to lose the default fields if the user provides the custom ones.
			const defaultFields = GoogleDrive.defaults.fields.split(", ");
			const customFields = o.fields.split(/,\s*/);
			const fields = [...defaultFields, ...customFields];

			this.file.fields = [...new Set(fields)].join(","); // Drop duplicates.
		}
	}

	async get (file) {
		if (!file.id) {
			// There is no file to work with.
			// We might have a URL of a folder (instead of a file) in which the file will be stored.
			// If not, the file will be stored directly in the user's “My Drive” folder.
			return null;
		}

		try {
			if (!file.info) {
				file.info = await this.#getFileInfo(file);
				file.filename = file.info.name;
			}

			const call = `drive/v3/files/${file.id}?key=${this.apiKey}&alt=media`;
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
		let fileInfo;

		if (!file.id) {
			// There is no file on the user's drive. We need to create it.
			try {
				fileInfo = await this.#createFile(file);

				file.url = new URL(fileInfo.webViewLink);
				file.id = fileInfo.id;
				file.info = fileInfo;
			}
			catch (e) {
				if (e.status === 401) {
					await this.logout(); // Access token we have is invalid. Discard it.
					throw new Error(this.constructor.phrase("access_token_invalid"));
				}

				const error = (await e.json()).error.message;
				throw new Error(error);
			}
		}

		try {
			return await this.#updateFile(file, serialized);
		}
		catch (e) {
			if (e.status === 401) {
				await this.logout(); // Access token we have is invalid. Discard it.
				throw new Error(this.constructor.phrase("access_token_invalid"));
			}
			else if (e.status === 403) {
				// No write permissions
				if (this.options.allowCreatingFiles) {
					// Create file in the specified folder or in the user's “My Drive” folder.
					try {
						fileInfo = await this.#createFile(file);

						file.url = new URL(fileInfo.webViewLink);
						file.id = fileInfo.id;
						file.info = fileInfo;

						return await this.#updateFile(file, serialized);
					}
					catch (e) {
						if (e.status === 401) {
							await this.logout(); // Access token we have is invalid. Discard it.
							throw new Error(this.constructor.phrase("access_token_invalid"));
						}

						const error = (await e.json()).error.message;
						throw new Error(error);
					}
				}
				else {
					throw new Error(this.constructor.phrase("no_write_permission", file.url.href));
				}
			}

			const error = (await e.json()).error.message;
			throw new Error(error);
		}
	}

	async upload (file, {filename = file.name, folder} = {}) {
		const metadata = {
			name: filename
		}

		if (folder) {
			const folderId = GoogleDrive.#getFolderId(folder);

			if (folderId) {
				metadata.parents = [folderId];
			}
		}

		const res = await this.request("upload/drive/v3/files?&fields=webViewLink&uploadType=resumable", metadata, "POST", {responseType: "response"});
		const call = res.headers.get("Location");

		try {
			const fileInfo = await this.request(call, file, "PATCH");
			return fileInfo.webViewLink;
		}
		catch (e) {
			if (e.status === 401) {
				await this.logout(); // Access token we have is invalid. Discard it.
				throw new Error(this.constructor.phrase("access_token_invalid"));
			}
			else if (e.status === 403) {
				throw new Error(this.constructor.phrase("no_upload_permission"));
			}

			const error = (await e.json()).error.message;
			throw new Error(error);
		}
	}

	async delete (file) {
		if (!file.id) {
			return;
		}

		try {
			return await this.request(`drive/v3/files/${file.id}?key=${this.apiKey}`, {trashed: true}, "PATCH");
		}
		catch (e) {
			if (e.status === 401) {
				await this.logout(); // Access token we have is invalid. Discard it.
				throw new Error(this.constructor.phrase("access_token_invalid"));
			}

			const error = (await e.json()).error.message;
			throw new Error(error);
		}
	}

	async login (...args) {
		const user = await super.login(...args);

		if (user) {
			this.updatePermissions({edit: true, save: true});
		}

		return user;
	}

	async #createFile (file) {
		const metadata = {
			mimeType: "application/json",
			name: file.filename
		};

		if (file.folderId) {
			metadata.parents = [file.folderId];
		}

		return await this.request(`drive/v3/files?key=${this.apiKey}&fields=${file.fields}`, metadata, "POST");
	}

	async #updateFile (file, data) {
		const call = `upload/drive/v3/files/${file.id}?key=${this.apiKey}&fields=${file.fields}&uploadType=multipart`;
		return await this.request(call, data, "PATCH");
	}

	async #getFileInfo (file) {
		const call = `drive/v3/files/${file.id}?key=${this.apiKey}&fields=${file.fields}`;
		return await this.request(call);
	}

	static #getFolderId (url) {
		url = new URL(url);
		const path = url.pathname.slice(1).split("/");

		if (path[0] && path[1] && (path[0] !== "drive" || path[1] === "my-drive")) {
			// Ignore URLs which are not URLs of folders on Google Drive.
			// Ignore the user's “My Drive” folder, which has no id.
			return;
		}

		if (path[1] === "folders") {
			return path[2];
		}
		else if (path[3] === "folders") {
			return path[4];
		}
	}

	static apiDomain = "https://www.googleapis.com/";
	static scopes = ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/userinfo.profile"];

	static test (url) {
		url = new URL(url);
		return url.host === "drive.google.com";
	}

	static defaults = {
		filename: "data.json",
		fields: "name, id, webViewLink"
	}

	static phrases = {
		"no_write_permission": (file) => `You do not have permission to write to file ${file}. Try enabling the allowCreatingFiles option to create a copy of it in your “My Drive” folder.`,
		"no_upload_permission": "You do not have permission to upload files."
	}

	/**
	 * Parse Files URLs.
	 * @param {string} source File URL.
	 * @returns URL, filename, [folder URL], [folder id], fields.
	 */
	static parseURL (source) {
		const ret = {
			url: new URL(source),
			filename: undefined,
			folder: undefined,
			fields: undefined
		};

		const path = ret.url.pathname.slice(1).split("/");
		const type = path[0];

		if (type === "file") {
			ret.id = path[2];
		}
		else if (type === "drive") {
			if (path[1] === "folders" || path[3] === "folders") {
				ret.folder = source;
				ret.folderId = path[1] === "folders"? path[2] : path[4];
			}
		}

		// Apply defaults.
		for (const part in ret) {
			if (ret[part] === undefined && part in GoogleDrive.defaults) {
				ret[part] = GoogleDrive.defaults[part];
			}
		}

		return ret;
	}
}