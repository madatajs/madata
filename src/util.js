/**
 * @module util
 */

/**
 * @memberof module:util
 * Determine the internal JavaScript [[Class]] of an object.
 * @param {*} o - Value to check
 * @returns {string}
 */
export function type (o) {
	let str = Object.prototype.toString.call(o);

	return (str.match(/^\[object\s+(.*?)\]$/)[1] || "").toLowerCase();
}

/**
 * Read a file object
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
 * Get the first element that matches a selector
 */
export function $ (selector, context = document) {
	return context.querySelector(selector);
}

/**
 * Get a promise that resolves after a delay
 * @param {Number} ms Delay in milliseconds
 * @returns {Promise}
 */
export function delay (ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wrap a value in an array, if it's not always an array
 * Useful for allowing function signatures to accept both single values and arrays
 * @param {*} value
 * @returns {Array}
 */
export function toArray (value) {
	return Array.isArray(value)? value : [value];
}

/**
 * Low-level function to facilitate localization
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

/**
 * Test whether a URL matches a set of criteria
 * @param {string | URL} url
 * @param {{protocol, host, urls} | {protocol, host, urls}[]} criteria
 * @returns {boolean}
 */
export function testURL (url, criteria) {
	if (typeof url === "string") {
		url = new URL(url);
	}

	if (Array.isArray(criteria.urls)) {
		return criteria.urls.some(pattern => testURL(url, pattern));
	}

	let {protocol, host, path} = criteria;

	if (protocol && url.protocol != protocol) {
		return false;
	}

	if (host) {
		if (host.startsWith("*.")) {
			// Wildcard subdomain
			host = host.replace(/^(\*\.)+/, "");

			if (url.host !== host && !url.host.endsWith("." + host)) {
				return false;
			}
		}
		else if (url.host != host) {
			return false;
		}
	}

	if (path && !url.pathname.startsWith(path)) {
		return false;
	}

	return true;
}