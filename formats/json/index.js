import Format from "../../src/format.js";

export default class JSON extends Format {
	static defaultOptions = {
		stringify: {
			replacer: null,
			space: "\t"
		}
	};
	static extensions = ["json"];
	static mimeTypes = ["application/json"];

	static parse (str) {
		return globalThis.JSON.parse(str);
	}

	static stringify (obj, options) {
		options = this.resolveOptions(options, "stringify");
		return globalThis.JSON.stringify(obj, options.replacer, options.space);
	}
}
