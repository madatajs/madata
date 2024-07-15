/** @module Util */

/**
 * Determine the internal JavaScript [[Class]] of an object.
 * @param {*} o - Value to check
 * @returns {string}
 */
export function type (o) {
	let str = Object.prototype.toString.call(o);

	return (str.match(/^\[object\s+(.*?)\]$/)[1] || "").toLowerCase();
}

/**
 * Read a file object.
 * @param {File | Blob} file - File or Blob object to read
 * @param {"DataURL" | "Text" | "ArrayBuffer" | "BinaryString"} [format="DataURL"] - Read as what? Must correspond to a `readAs` method on FileReader
 */
export function readFile (file, format = "DataURL") {
	let reader = new FileReader();

	return new Promise((resolve, reject) => {
		reader.onload = f => resolve(reader.result);
		reader.onerror = reader.onabort = reject;
		reader["readAs" + format](file);
	});
}

/**
 * Get the first element that matches a selector.
 */
export function $ (selector, context = document) {
	return context.querySelector(selector);
}

/**
 * Get a promise that resolves after a delay.
 * @param {Number} ms Delay in milliseconds
 * @returns {Promise}
 */
export function delay (ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wrap a value in an array, if it's not always an array.
 * Useful for allowing function signatures to accept both single values and arrays.
 * @param {*} value
 * @returns {Array}
 */
export function toArray (value) {
	return Array.isArray(value) ? value : [value];
}

/**
 * Low-level function to facilitate localization.
 * @param {*} me - Class or object containing the phrases
 * @param {*} id - Phrase id
 * @param {...any} args - Optional arguments to pass to the phrase
 * @returns {string}
 */
export function phrase (me, id, ...args) {
	let ret = me.phrases?.[id];

	if (ret) {
		if (typeof ret === "function") {
			return ret(...args);
		}

		return ret;
	}

	// Not found, look in ancestors
	let parent = Object.getPrototypeOf(me);
	if (parent?.phrases) {
		return phrase(parent, id, ...args);
	}

	// We're on the root class and still can't find it
	// Fall back to just displaying the id and all the args right after it
	return id + " " + args.join(" ");
}

export const URLPattern = globalThis.URLPattern ?? (await import("../node_modules/urlpattern-polyfill/index.js")).URLPattern;

export function testURLs (source, urls) {
	if (!urls) {
		return false;
	}

	for (let i = 0; i < urls.length; i++) {
		let url = urls[i];

		if (!(url instanceof URLPattern)) {
			url = urls[i] = new URLPattern(url);
		}

		if (url.test(source)) {
			return true;
		}
	}

	return false;
}

export function matchURLs (source, urls) {
	if (!urls) {
		return null;
	}

	for (let i = 0; i < urls.length; i++) {
		let url = urls[i];

		if (!(url instanceof URLPattern)) {
			url = urls[i] = new URLPattern(url);
		}

		let match = matchURL(source, url);

		if (match) {
			return match;
		}
	}

	return null;
}

export function matchURL (source, urlPattern) {
	let match = urlPattern.exec(source);

	if (!match) {
		return null;
	}

	// Go through all possible URL parts and extract matched groups
	let ret = {};

	for (let part in match) {
		let partGroups = match[part].groups;

		for (let group in partGroups) {
			if (isNaN(group)) { // Skip numeric groups
				ret[group] = partGroups[group];
			}
		}
	}

	return ret;
}
