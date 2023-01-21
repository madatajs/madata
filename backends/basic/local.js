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

		throw null;
	}

	async put (serialized) {
		if (!serialized) {
			delete localStorage[this.file.key];
		}
		else {
			localStorage[this.file.key] = serialized;
		}

		return serialized;
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