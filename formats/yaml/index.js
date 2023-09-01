import Format from "../../src/format.js";
import { parse, stringify } from "/lib/yaml/browser/index.js";

export default class YAML extends Format {
	static extensions = ["yaml", "yml"];
	static mimeTypes = ["application/yaml", "application/x-yaml", "text/yaml"];

	static parse(str, options) {
		options = this.resolveOptions(options, "parse");
		return parse(str, options);
	}

	static stringify(obj, options) {
		options = this.resolveOptions(options, "stringify");
		return stringify(obj, options);
	}
}