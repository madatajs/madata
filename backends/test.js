import basicBackendsTests from "./basic/test.js";
import codaBackendsTests from "./coda/test.js";
import dropboxBackendTests from "./dropbox/test.js";
// import firebaseBackendTests from "./firebase/test.js";
import githubBackendsTests from "./github/test.js";
import googleBackendsTests from "./google/test.js";

export default {
	name: "All backend tests",
	tests: [
		basicBackendsTests,
		codaBackendsTests,
		dropboxBackendTests,
		// firebaseBackendTests,
		githubBackendsTests,
		googleBackendsTests,
	],
};
