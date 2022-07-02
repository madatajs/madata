/**
 * Determine the internal JavaScript [[Class]] of an object.
 * @param {*} o - Value to check
 * @returns {string}
 */
export function type (o) {
	let str = Object.prototype.toString.call(o);

	return (str.match(/^\[object\s+(.*?)\]$/)[1] || "").toLowerCase();
}

export function readFile (file, format = "DataURL") {
	let reader = new FileReader();

	return new Promise((resolve, reject) => {
		reader.onload = f => resolve(reader.result);
		reader.onerror = reader.onabort = reject;
		reader["readAs" + format](file);
	});
}

export function $(selector, context = document) {
	return context.querySelector(selector);
}