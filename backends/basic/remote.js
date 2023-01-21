/**
 * @class Remote
 * Load from a remote URL, no save
 */
import Backend from "../../src/backend.js";

export default class Remote extends Backend {
	constructor (url, o) {
		super(url, o);
		this.updatePermissions({read: true});
	}

	static test (url) {
		return false;
	}
}