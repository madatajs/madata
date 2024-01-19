import Format from "../../src/format.js";

/**
 * @class Text
 * @extends Format
 */
export default class Text extends Format {
	static extensions = ["txt", "md"];
	static mimeTypes = ["text/plain"];

	parse (str) {
		return str;
	}

	stringify (obj) {
		return obj + "";
	}
}
