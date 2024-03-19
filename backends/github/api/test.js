import {default as GithubAPI} from "./github-api.js";

export default {
	name: "GithubAPI",
	description: "These tests validate the GithubAPI backend implementation.",
	tests: [
		{
			name: "URL parsing",
			description: "These tests test whether GithubAPI.parseURL() produces correct results.",
			run (source) {
				const ret = GithubAPI.parseURL(source);
				delete ret.url;

				return ret;
			},
			tests: [
				{
					name: "Raw API calls",
					tests: [
						{
							arg: "https://api.github.com/repos/mavoweb/mavo/commits/ed03ff78fa6e2cb38af1901ab379e205419b24aa",
							expect: {apiCall: "repos/mavoweb/mavo/commits/ed03ff78fa6e2cb38af1901ab379e205419b24aa"},
						},
						{
							arg: "https://api.github.com/repos/foo/bar/contents/baz.json",
							expect: {apiCall: "repos/foo/bar/contents/baz.json"},
						},
						{
							arg: "https://api.github.com/user",
							expect: {apiCall: "user"},
						},
					],
				},
				{
					name: "GraphQL",
					tests: [
						{
							arg: "https://api.github.com/graphql",
							expect: {query: undefined},
						},
						{
							arg: "https://api.github.com/graphql#query{viewer { login }}",
							expect: {query: "query{viewer { login }}"},
						},
						{
							name: "Preserve line breaks",
							arg: `https://api.github.com/graphql#query
{viewer
	{ login }}`,
							expect: {query: "query\n{viewer\n\t{ login }}"},
						},
					],
				},
			],
		},
	],
};
