let markdownIt = require("markdown-it");
let markdownItAnchor = require("markdown-it-anchor");
let markdownItAttrs = require('markdown-it-attrs');

module.exports = config => {
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

	let md = markdownIt({
		html: true,
		linkify: true,
	})
	.disable("code");

	config.setLibrary("md", markdownIt({
			html: true,
		})
		.use(markdownItAttrs)
		.use(markdownItAnchor, {
			permalink: markdownItAnchor.permalink.headerLink(),
			level: 2,
		})
		.disable("code")
	);

	config.addFilter("md", (value) => {
		return md.render(value);
	});

	config.addFilter("md_inline", (value) => {
		return md.renderInline(value);
	});

	config.addFilter(
		"relative",
		page => {
			let path = page.url.replace(/[^/]+$/, "");
			let ret = require("path").relative(path, "/");

			return ret || ".";
		}
	);

	return {
		markdownTemplateEngine: "njk",
		templateFormats: ["md", "njk"],
		dir: {
			output: "."
		},
	};
};
