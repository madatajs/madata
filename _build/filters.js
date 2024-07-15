import path from "path";

export function relative (page) {
	if (!page) {
		return "";
	}

	let url = page.url ?? page;
	let pagePath = url.replace(/[^/]+$/, "");
	let ret = path.relative(pagePath, "/");

	return ret || ".";
}