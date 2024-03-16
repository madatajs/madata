import {default as Local} from "./local.js";

export default {
	name: "Basic backends tests",
	description: "These tests validate the basic backends implementation.",
	tests: [
		{
			name: "Local",
			tests: [
				{
					name: "URL parsing",
					description: "These tests test whether Local.parseURL() produces correct results.",
					run (source) {
						const ret = Local.parseURL(source);
						delete ret.url;

						return ret;
					},
					tests: [
						{
							arg: "local:foo",
							expect: {key: "foo"},
						},
					],
				},
			],
		},
	],
};
