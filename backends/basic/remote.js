import Backend from "../../src/backend.js";

/**
 * Load the URL as a remote resource. No save.
 * @category Basic
 */
export default class Remote extends Backend {
	static defaultPermissions = { read: true };

	static test (url) {
		return false;
	}
}
