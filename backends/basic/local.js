import Backend from "../../src/backend.js";
import { localStorage } from "../../src/node-shims.js";

/**
 * Store data in the browser's localStorage.
 * @class Local
 * @extends Backend
 * @category Basic
 */
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
		if (this.ref.key in localStorage) {
			return localStorage[this.ref.key];
		}

		return null;
	}

	async put (data) {
		if (!data) {
			delete localStorage[this.ref.key];
			return {type: "delete"};
		}

		let exists = this.ref.key in localStorage;
		localStorage[this.ref.key] = await this.stringify(data);
		return {type: exists ? "update" : "create"};
	}

	static parseURL (source) {
		let ret = super.parseURL(source);
		ret.key = ret.url.pathname;
		return ret;
	}

	static protocol = "local:";
}
