import Format from "../../src/format.js";
import { parse, stringify } from "/lib/csv/dist/esm/sync.js";

export default class CSV extends Format {
	static defaultOptions = {
		columns: true,
		skip_empty_lines: true,
		bom: true,
		cast: true
	};

	static extensions = ["csv"];
	static mimeTypes = ["text/csv"];

	static parse (str, options) {
		options = this.resolveOptions(options);
		return parse(str, options);
	}

	static stringify (obj, options) {
		options = this.resolveOptions(options);
		return stringify(obj, options);
	}
}