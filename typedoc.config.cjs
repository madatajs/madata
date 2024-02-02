/** @type {import("typedoc").TypeDocOptions} */

module.exports = {
	name: "Madata API",
	plugin: [
		"typedoc-plugin-merge-modules",
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
	readme: "API.md",
	out: "api",
	// "lightHighlightTheme": "solarized-light", // See https://shiki.matsu.io/themes#bundled-themes
	// "darkHighlightTheme": "solarized-dark",
	customCss: "api.css",
};
