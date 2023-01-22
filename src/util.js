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
export function $(selector, context = document) {
	return context.querySelector(selector);
}

/**
 * Get a promise that resolves after a delay
 * @param {Number} ms Delay in milliseconds
 * @returns {Promise}
 */
export function delay(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wrap a value in an array, if it's not always an array
 * Useful for allowing function signatures to accept both single values and arrays
 * @param {*} value
 * @returns {Array}
 */
export function toArray(value) {
	return Array.isArray(value)? value : [value];
}