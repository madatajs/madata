import srcTests from "./index-src.js";
import formatTests from "../formats/test.js";
import backendTests from "../backends/test.js";


export default {
	name: "All Madata tests",
	tests: [
		srcTests,
		formatTests,
		backendTests,
	],
};
