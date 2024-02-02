import { JSX } from "typedoc";

/**
 * Include the Prism files in the page.
 */
export function load (app) {
	app.renderer.hooks.on("head.end", () => (JSX.createElement("link", { rel: "stylesheet", href: "https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css" })));
	app.renderer.hooks.on("body.end", () => (JSX.createElement(JSX.Fragment, null,
		JSX.createElement("script", { src: "https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-core.min.js" }),
		JSX.createElement("script", { src: "https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js" }))));
}
