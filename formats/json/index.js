import Format from "../../src/format.js";

export default class JSON extends Format {
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
};