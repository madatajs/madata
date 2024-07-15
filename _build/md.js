import markdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";
import markdownItAttrs from "markdown-it-attrs";

export default function (config) {
	let md = markdownIt({
		html: true,
		linkify: true,
	})
		.use(markdownItAttrs)
		.use(markdownItAnchor, {
			permalink: markdownItAnchor.permalink.headerLink(),
			level: 2,
		})
		.disable("code");

	config.setLibrary("md", md);

	config.addFilter("md", (value) => {
		return md.render(value);
	});

	config.addFilter("md_inline", (value) => {
		return md.renderInline(value);
	});
}