import githubAPITests from "./api/test.js";
import githubFileTests from "./file/test.js";
import githubGistTests from "./gist/test.js";

export default {
	name: "Github backends tests",
	tests: [
		githubAPITests,
		githubFileTests,
		githubGistTests,
	],
};
