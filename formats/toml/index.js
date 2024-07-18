import Format from "../../src/format.js";
import toml from "../../node_modules/smol-toml/dist/index.js";

export default class TOML extends Format {
	static extensions = ["toml"];
	static mimeTypes = ["application/toml"];

	static parse (str, options) {
		options = this.resolveOptions(options, "parse");
		return toml.parse(str, options);
	}

	static stringify (obj, options) {
		options = this.resolveOptions(options, "stringify");
		return toml.stringify(obj, options);
	}
}
