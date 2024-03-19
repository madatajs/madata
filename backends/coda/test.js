import codaAPITests from "./api/test.js";
import codaTableTests from "./table/test.js";


export default {
	name: "Coda backends tests",
	tests: [
		codaAPITests,
		codaTableTests,
	],
};
