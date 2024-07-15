import path from "path";
import packageLock from "../package-lock.json" with { type: "json" };

export function relative (page) {
	if (!page) {
		return "";
	}

	let url = page.url ?? page;
	let pagePath = url.replace(/[^/]+$/, "");
	let ret = path.relative(pagePath, "/");

	return ret || ".";
}

/**
 * Convert a package.json dependency version to
 * @param {*} semver
 * @returns
 */
export function version (module) {
	return packageLock.packages[`node_modules/${module}`]?.version;
}