/**
 * Export all backends and register them.
 * @module Backends
 */
import Backend from "../src/backend.js";
import * as backends from "./index-fn.js";

// Subclasses should be registered before their parents
let sortedBackends = Object.values(backends).sort((a, b) => b.prototype instanceof a ? 1 : -1);
for (let backend of sortedBackends) {
	Backend.register(backend);
}

export * from "./index-fn.js";
