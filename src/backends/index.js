/**
 * Export all backends and register them
 */
import Backend from "../backend.js";
import * as backends from "./index-fn.js";

for (let backend in backends) {
	Backend.register(backends[backend]);
}

export * from "./index-fn.js";