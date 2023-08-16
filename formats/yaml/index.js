import Format from "../../src/format.js";
import { parse, stringify } from "../../node_modules/yaml/browser/index.js";

export default class YAML extends Format {
	static defaultOptions = {
		blockQuote: false
	};
	static extensions = ["yaml", "yml"];
	static mimeTypes = ["application/x-yaml", "text/yaml"];

	static parse(str, options) {
		options = this.resolveOptions(options);
		return parse(str, options);
	}

	static stringify(obj, options) {
		options = this.resolveOptions(options);
		return stringify(obj, options);
	}
}