/**
 * @module index-fn
 * Export all backends without side effects
 */

export * from "./basic/index.js";
export * from "./github/index.js";
export {default as Dropbox} from "./dropbox/index.js";
export * from "./google/index.js";
export * from "./coda/index.js";
export {default as Firebase} from "./firebase/index.js";
