import Format from "../../src/format.js";
import { parse, stringify } from "../../lib/csv/dist/esm/sync.js";

export default class CSV extends Format {
	static defaultOptions = {
		parse: {
			columns: true,
			cast: true,
			bom: true,
			skip_empty_lines: true,
		},
		stringify: {
			header: true
		}
	};

	static extensions = ["csv"];
	static mimeTypes = ["text/csv"];

	static parse (str, options) {
		options = this.resolveOptions(options, "parse");
		return parse(str, options);
	}

	static stringify (obj, options) {
		options = this.resolveOptions(options, "stringify");
		return stringify(obj, options);
	}
}
