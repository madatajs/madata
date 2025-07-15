import Format from "../../src/format.js";
import { BibLatexParser, BibLatexExporter } from "https://esm.sh/biblatex-csl-converter/lib/index.js";

export default class BibTeX extends Format {
	static defaultOptions = {
		processUnexpected: true,
		processUnknown: true,
	};

	static extensions = ["bib"];
	static mimeTypes = ["text/plain"];

	static parse (str, options) {
		options = this.resolveOptions(options, "parse");
		return new BibLatexParser(str, options).parse();
	}

	static stringify (obj, options) {
		options = this.resolveOptions(options, "stringify");
		return new BibLatexExporter(obj.entries, false, options).parse();
	}
}
