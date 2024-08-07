import Google from "../google.js";

/**
 * Google Drive backend.
 * @category Google
 */
export default class GoogleDrive extends Google {
	static apiDomain = "https://www.googleapis.com/";
	static scopes = ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/userinfo.email"];
	static fileBased = true;
	static capabilities = { auth: true, put: true, upload: true };

	update (url, o = {}) {
		super.update(url, o);

		if (o.folder) {
			const folderId = GoogleDrive.#getFolderId(o.folder);

			if (!folderId) {
				delete this.ref.folder;
				return;
			}

			this.ref.folderId = folderId;
		}

		if (o.fields) {
			// We don't want to lose the default fields if the user provides the custom ones.
			const defaultFields = GoogleDrive.defaults.fields.split(", ");
			const customFields = o.fields.split(/,\s*/);
			const fields = [...defaultFields, ...customFields];

			this.ref.fields = [...new Set(fields)].join(","); // Drop duplicates.
		}
	}

	async get (ref = this.ref) {
		if (!ref.id) {
			// There is no file to work with.
			// We might have a URL of a folder (instead of a file) in which the file will be stored.
			// If not, the file will be stored directly in the user's “My Drive” folder.
			return null;
		}

		try {
			if (!ref.info) {
				ref.info = await this.#getFileInfo(ref);
				ref.filename = ref.info.name;
			}

			const call = `drive/v3/files/${ref.id}?key=${this.apiKey}&alt=media`;
			return this.request(call);
		}
		catch ({ error }) {
			if (error.code === 401) {
				await this.logout(); // Access token we have is invalid. Discard it.
				throw new Error(this.constructor.phrase("invalid_access_token"));
			}

			if (error.code === 404) {
				// File might be private, but if the user is the file owner, the authenticated request will return it.
				return null;
			}
		}
	}

	async put (data, {ref = this.ref} = {}) {
		const serialized = await this.stringify(data, {ref});
		let fileInfo;

		if (!ref.id) {
			// There is no file on the user's drive. We need to create it.
			try {
				fileInfo = await this.#createFile(ref);

				ref.url = new URL(fileInfo.webViewLink);
				ref.id = fileInfo.id;
				ref.info = fileInfo;
			}
			catch ({ error }) {
				if (error.code === 401) {
					await this.logout(); // Access token we have is invalid. Discard it.
					throw new Error(this.constructor.phrase("invalid_access_token"));
				}

				throw new Error(error.message);
			}
		}

		try {
			return this.#updateFile(ref, serialized);
		}
		catch ({ error }) {
			if (error.code === 401) {
				await this.logout(); // Access token we have is invalid. Discard it.
				throw new Error(this.constructor.phrase("invalid_access_token"));
			}
			else if (error.code === 403) {
				// No write permissions
				if (this.options.allowCreatingFiles) {
					// Create file in the specified folder or in the user's “My Drive” folder.
					try {
						fileInfo = await this.#createFile(ref);

						ref.url = new URL(fileInfo.webViewLink);
						ref.id = fileInfo.id;
						ref.info = fileInfo;

						return this.#updateFile(ref, serialized);
					}
					catch ({ error }) {
						if (error.code === 401) {
							await this.logout(); // Access token we have is invalid. Discard it.
							throw new Error(this.constructor.phrase("invalid_access_token"));
						}

						throw new Error(error.message);
					}
				}
				else {
					throw new Error(this.constructor.phrase("no_write_permission", ref));
				}
			}

			throw new Error(error.message);
		}
	}

	async upload (file, {folder} = {}) {
		// FIXME is folder a path or a URL?
		// it should be possible to specify a path!
		const metadata = {
			name: file.name
		};

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
		catch ({ error }) {
			if (error.code === 401) {
				await this.logout(); // Access token we have is invalid. Discard it.
				throw new Error(this.constructor.phrase("invalid_access_token"));
			}
			else if (error.code === 403) {
				throw new Error(this.constructor.phrase("no_upload_permission"));
			}

			throw new Error(error.message);
		}
	}

	async delete (ref) {
		if (!ref.id) {
			return;
		}

		try {
			return this.request(`drive/v3/files/${ref.id}?key=${this.apiKey}`, {trashed: true}, "PATCH");
		}
		catch ({ error }) {
			if (error.code === 401) {
				await this.logout(); // Access token we have is invalid. Discard it.
				throw new Error(this.constructor.phrase("invalid_access_token"));
			}

			throw new Error(error.message);
		}
	}

	async login (...args) {
		const user = await super.login(...args);

		if (user) {
			this.updatePermissions({edit: true, save: true});
		}

		return user;
	}

	async #createFile (ref) {
		const metadata = {
			mimeType: "application/json",
			name: ref.filename
		};

		if (ref.folderId) {
			metadata.parents = [ref.folderId];
		}

		return this.request(`drive/v3/files?key=${this.apiKey}&fields=${ref.fields}`, metadata, "POST");
	}

	async #updateFile (ref, data) {
		const call = `upload/drive/v3/files/${ref.id}?key=${this.apiKey}&fields=${ref.fields}&uploadType=multipart`;
		return this.request(call, data, "PATCH");
	}

	async #getFileInfo (ref) {
		const call = `drive/v3/files/${ref.id}?key=${this.apiKey}&fields=${ref.fields}`;
		return this.request(call);
	}

	static #getFolderId (url) {
		// FIXME this should probably use parseURL, not reimplement it
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

	static urls = [
		{hostname: "drive.google.com", pathname: "/file/d/:id/*"},
		{hostname: "drive.google.com", pathname: "/drive/*/my-drive"},
		{hostname: "drive.google.com", pathname: "*/folders/:folderId"},
	];

	static defaults = {
		filename: "data.json",
		fields: "name, id, webViewLink"
	};

	static phrases = {
		"no_write_permission": (file) => `You do not have permission to write to file ${file.url.href}. Try enabling the allowCreatingFiles option to create a copy of it in your “My Drive” folder.`,
	};

	/**
	 * Parse Files URLs.
	 * @param {string} source File URL.
	 * @returns URL, filename, [folder URL], [folder id], fields.
	 */
	static parseURL (source) {
		// FIXME use defaults field
		let ret = Object.assign({
			filename: undefined,
			folder: undefined,
			fields: undefined
		}, super.parseURL(source));

		if (ret.folderId) {
			ret.folder = source;
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
