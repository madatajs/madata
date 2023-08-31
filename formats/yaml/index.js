import Format from "../../src/format.js";
import { parse, stringify } from "/lib/yaml/browser/index.js";

export default class YAML extends Format {
	static extensions = ["yaml", "yml"];
	static mimeTypes = ["application/yaml", "application/x-yaml", "text/yaml"];

	static parse(str, options) {
		options = YAML.resolveOptions(options);
		return parse(str, options);
	}

	static stringify(obj, options) {
		options = YAML.resolveOptions(options);
		return stringify(obj, options);
	}
}