import Format from "../../src/format.js";
import { parse, stringify } from "../../node_modules/smol-toml/dist/index.js";

export default class TOML extends Format {
	static extensions = ["toml"];
	static mimeTypes = ["application/toml"];

	static parse (str, options) {
		options = this.resolveOptions(options, "parse");
		return parse(str, options);
	}

	static stringify (obj, options) {
		options = this.resolveOptions(options, "stringify");
		return stringify(obj, options);
	}
}
