/**
 * @module formats/index
 * Export all formats and register them
 */
import Format from "../src/format.js";
import * as formats from "./index-fn.js";

for (let name in formats) {
	Format.register(formats[name]);
}

export * from "./index-fn.js";