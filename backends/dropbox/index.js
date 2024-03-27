import OAuthBackend from "../../src/oauth-backend.js";

/**
 * Dropbox backend.
 */
export default class Dropbox extends OAuthBackend {
	static apiDomain = "https://api.dropboxapi.com/2/";
	static oAuth = "https://www.dropbox.com/oauth2/authorize";
	static fileBased = true;
	static urls = [
		{hostname: "{*.}?dropbox.com"},
	];

	constructor (url, o) {
		super(url, o);

		this.updatePermissions({ read: true });
	}

	async upload (file, path) {
		if (this.ref.path) {
			path = this.ref.path.replace(/[^/]+$/, "") + path; // make upload path relative to existing path
		}
		else {
			path = path.startsWith("/") ? path : "/" + path;
		}

		const ref = this._getRef(path);
		await this.put(file, {ref, isUploading: true});

		return this.getURL(path);
	}

	async getURL (path) {
		let shareInfo;
		try {
			shareInfo = await this.request("sharing/create_shared_link_with_settings", {path}, "POST");
		}
		catch (err) {
			if (err.error["shared_link_already_exists"]) {
				const metadata = err.error["shared_link_already_exists"].metadata;
				shareInfo = metadata ?? (await this.request("sharing/list_shared_links", {path}, "POST")).links[0];
			}
			else {
				throw err;
			}
		}

		return Dropbox.#fixShareURL(shareInfo.url);
	}

	/**
	 * Saves a file to the backend.
	 * @param {Object} file - An object with name & data keys
	 * @return {Promise} A promise that resolves when the file is saved.
	 */
	async put (data, {ref, path = ref.path, isUploading} = {}) {
		const serialized = isUploading ? data : await this.stringify(data, {ref});

		return this.request("https://content.dropboxapi.com/2/files/upload", serialized, "POST", {
			headers: {
				"Dropbox-API-Arg": JSON.stringify({
					path,
					mode: "overwrite"
				}),
				"Content-Type": "application/octet-stream"
			}
		});
	}

	oAuthParams () {
		return `&redirect_uri=${encodeURIComponent(this.constructor.authProvider)}&response_type=code`;
	}

	static userCall = ["users/get_current_account", "null", "POST"];
	static userSchema = {
		username: "email",
		name: "name.display_name",
		avatar: "profile_photo_url",
	};

	async login (...args) {
		await super.login(...args);

		if (this.user) {
			// Check if can actually edit the file
			// TODO move to load()?
			let info = await this.request("sharing/get_shared_link_metadata", {
				"url": this.source
			}, "POST");

			if (info.path_lower) {
				this.ref.path = info.path_lower;
				this.updatePermissions({edit: true, save: true});
			}
		}

		return this.user;
	}

	static parseURL (source) {
		let ret = super.parseURL(source);
		ret.originalURL = ret.url;
		ret.url = Dropbox.#fixShareURL(ret.url);
		return ret;
	}

	// Transform the dropbox shared URL into something raw and CORS-enabled
	static #fixShareURL = url => {
		url = new URL(url, globalThis.location);
		url.hostname = "dl.dropboxusercontent.com";
		url.search = url.search.replace(/\bdl=0|^$/, "raw=1");
		return url;
	};
}
