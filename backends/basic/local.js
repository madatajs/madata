/**
 * Store data in localStorage
 * @class Local
 */
import Backend from "../../src/backend.js";

export default class Local extends Backend {
	constructor (url, o) {
		super(url, o);

		this.updatePermissions({
			read: true,
			edit: true,
			save: true
		});
	}

	async get () {
		if (this.file.key in localStorage) {
			return localStorage[this.file.key];
		}

		return null;
	}

	async put (data) {
		if (!data) {
			delete localStorage[this.file.key];
			return {type: "delete"}
		}

		let exists = this.file.key in localStorage;
		localStorage[this.file.key] = await this.stringify(data);
		return {type: exists? "update" : "create"}
	}

	static parseURL(source) {
		const url = new URL(source);
		let key = url.pathname;
		return {key};
	}

	static test (source) {
		let url = new URL(source);
		return url.protocol == "local:";
	}
}