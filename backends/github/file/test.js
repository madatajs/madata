import {default as GithubFile} from "./github-file.js";

export default {
	name: "GithubFile",
	description: "These tests validate the GithubFile backend implementation.",
	tests: [
		{
			name: "URL parsing",
			description: "These tests test whether GithubFile.parseURL() produces correct results.",
			run (source) {
				const ret = GithubFile.parseURL(source);
				delete ret.url;

				return ret;
			},
			tests: [
				{
					arg: "https://github.com/foo/bar/blob/main/baz.json",
					expect: {owner: "foo", repo: "bar", branch: "main", path: "baz.json"},
				},
				{
					arg: "https://github.com/foo/bar/baz.json",
					expect: {owner: "foo", repo: "bar", branch: undefined, path: "baz.json"},
				},
				{
					arg: "https://raw.githubusercontent.com/foo/bar/main/baz.json",
					expect: {owner: "foo", repo: "bar", branch: "main", path: "baz.json"},
				},
				{
					name: "With applied defaults",
					arg: "https://github.com",
					expect: {owner: undefined, repo: GithubFile.defaults.repo, branch: undefined, path: GithubFile.defaults.path},
				},
				{
					name: "No URL",
					arg: undefined,
					expect: {owner: undefined, repo: undefined, branch: undefined, path: undefined},
				},
			],
		},
	],
};
