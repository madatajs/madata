import Backend from "../../src/backend.js";
import { localStorage } from "../../src/node-shims.js";

/**
 * Store data in the browser's localStorage.
 * @category Basic
 */
export default class Local extends Backend {
	static capabilities = { put: true };

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

	static urls = [
		{protocol: "local", pathname: ":key"},
	];
}
