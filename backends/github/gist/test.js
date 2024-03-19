import {default as GithubGist} from "./github-gist.js";

export default {
	name: "GithubGist",
	description: "These tests validate the GithubGist backend implementation.",
	tests: [
		{
			name: "URL parsing",
			description: "These tests test whether GithubGist.parseURL() produces correct results.",
			run (source) {
				const ret = GithubGist.parseURL(source);
				delete ret.url;

				return ret;
			},
			tests: [
				{
					arg: "https://gist.github.com/foo/eed121799a4118cdc2f139136cf7dbe8",
					expect: {owner: "foo", gistId: "eed121799a4118cdc2f139136cf7dbe8"},
				},
				{
					arg: "https://gist.github.com/foo/eed121799a4118cdc2f139136cf7dbe8/raw",
					expect: {owner: "foo", gistId: "eed121799a4118cdc2f139136cf7dbe8"},
				},
				{
					arg: "https://gist.github.com/foo/eed121799a4118cdc2f139136cf7dbe8/raw/bar.json",
					expect: {owner: "foo", gistId: "eed121799a4118cdc2f139136cf7dbe8", path: "bar.json"},
				},
				{
					arg: "https://gist.githubusercontent.com/foo/eed121799a4118cdc2f139136cf7dbe8/raw/yolobaz/bar.json",
					expect: {owner: "foo", gistId: "eed121799a4118cdc2f139136cf7dbe8", revision: "yolobaz", path: "bar.json"},
				},
				{
					arg: "https://gist.githubusercontent.com/foo/eed121799a4118cdc2f139136cf7dbe8/raw/bar.json",
					expect: {owner: "foo", gistId: "eed121799a4118cdc2f139136cf7dbe8", path: "bar.json"},
				},
				{
					arg: "https://gist.github.com/foo/NEW",
					expect: {owner: "foo", gistId: undefined},
				},
			],
		},
	],
};
