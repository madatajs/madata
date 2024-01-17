/**
 * Store data in localStorage
 * @class Local
 */
import Backend from "../../src/backend.js";
import { localStorage } from "../../src/node-shims.js";

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
			return {type: "delete"};
		}

		let exists = this.file.key in localStorage;
		localStorage[this.file.key] = await this.stringify(data);
		return {type: exists ? "update" : "create"};
	}

	static parseURL (source) {
		let ret = super.parseURL(source);
		ret.key = ret.url.pathname;
		return ret;
	}

	static protocol = "local:";
}
