import { createRequire } from "module";
import md from "./md.js";
import * as filters from "./filters.js";

const require = createRequire(import.meta.url);

export default config => {
	let data = {
		"layout": "page.njk",
		"permalink": "{{ page.filePathStem | replace('README', '') }}/index.html",
		eleventyComputed: {
			defaultTitle: data => {
				if (data.id) {
					return data.id;
				}

				return "Madata: Make any cloud service with an API your backend!";
			}
		}
	};

	for (let p in data) {
		config.addGlobalData(p, data[p]);
	}

	config.setDataDeepMerge(true);

	config.addPlugin(md);

	for (let f in filters) {
		config.addFilter(f, filters[f]);
	}

	return {
		markdownTemplateEngine: "njk",
		templateFormats: ["md", "njk"],
		dir: {
			output: "."
		},
	};
};
