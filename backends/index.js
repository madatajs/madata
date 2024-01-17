/**
 * @module index
 * Export all backends and register them
 */
import Backend from "../src/backend.js";
import * as backends from "./index-fn.js";

for (let name in backends) {
	let backend = backends[name];

	Backend.register(backend);
}

export * from "./index-fn.js";
