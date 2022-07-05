import Backend from "../src/backend.js";

/**
 * Load from a remote URL, no save
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