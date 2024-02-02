/** @type {import("typedoc").TypeDocOptions} */

function escape (html) {
	const escapes = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#39;",
	};

	return html.replace(/[&<>'"]/g, (c) => escapes[c]);
}

module.exports = {
	name: "Madata API",
	plugin: [
		"typedoc-plugin-merge-modules",
		"./typedoc-prism.js",
	],
	mergeModulesRenameDefaults: true,
	mergeModulesMergeMode: "module",
	entryPoints: [
		"src/*.js",
		"backends/index.js",
		"formats/index.js",
	],
	exclude: [
		"src/node-shims.js",
	],
	excludeReferences: true,
	navigation: {
		includeCategories: true,
		includeFolders: false,
	},
	visibilityFilters: {
		inherited: true,
		private: false,
	},
	markedOptions: {
		highlight: (code, lang) => escape(code), // Use custom syntax highlighter. The only thing we do is escape some characters to make Prism highlight the code correctly.
	},
	readme: "API.md",
	out: "api",
	customCss: "api.css",
};
