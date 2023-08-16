import Format from "../../src/format.js";

// name is not JSON to avoid conflict with the built-in JSON object
export default class Json extends Format {
	static defaultOptions = {
		replacer: null,
		space: "\t"
	};
	static extensions = ["json"];
	static mimeTypes = ["application/json"];

	static parse (str) {
		return JSON.parse(str);
	}

	static stringify (obj, options) {
		options = this.resolveOptions(options);
		return JSON.stringify(obj, options.replacer, options.space);
	}
}