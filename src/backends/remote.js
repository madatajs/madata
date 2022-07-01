import Backend from "./backend.js";

/**
 * Load from a remote URL, no save
 */
export default class Remote extends Backend {
	id = "Remote"

	constructor (url, o) {
		super(url, o);
		this.permissions.on("read");
	}

	static test (url) {
		return false;
	}
}