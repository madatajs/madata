import Backend from "../../src/backend.js";

/**
 * Load the URL as a remote resource. No save.
 * @class Remote
 * @extends Backend
 * @category Basic
 */
export default class Remote extends Backend {
	constructor (url, o) {
		super(url, o);
		this.updatePermissions({read: true});
	}

	static test (url) {
		return false;
	}
}
