import Backend from "./backend.js";

/**
 * Store data in localStorage
 */
export default class Local extends Backend {
	id = "Local"

	constructor (url, o) {
		super(url, o);
		this.permissions.on(["read", "edit", "save"]);
		this.key = o.key;
	}

	get () {
		return Promise[this.key in localStorage? "resolve" : "reject"](localStorage[this.key]);
	}

	put (serialized) {
		if (!serialized) {
			delete localStorage[this.key];
		}
		else {
			localStorage[this.key] = serialized;
		}

		return Promise.resolve(serialized);
	}

	static test (value) {
		return value == "local";
	}
}