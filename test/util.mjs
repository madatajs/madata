import { testURL } from "../src/util.js";

export default {
	name: "Util",
	description: "These tests test whether Madata utility functions produce correct results.",
	tests: [
		{
			name: "testURL()",
			run: testURL,
			tests: [
				{
					name: "Basic",
					tests: [
						{
							name: "URL as string",
							args: ["https://example.com/foo/bar", {protocol: "https:", host: "example.com"}],
							expect: true,
						},
						{
							name: "URL as a URL object",
							args: [new URL("https://example.com/foo/bar"), {protocol: "https:", host: "example.com"}],
							expect: true,
						},
						{
							args: ["https://example.com/foo/bar/baz", {path: "/foo/bar/"}],
							expect: true,
						},
					],
				},
				{
					name: "Local Backend",
					tests: [
						{
							args: ["local:foo", {protocol: "local:"}],
							expect: true,
						},
					]
				},
				{
					name: "Dropbox Backend",
					tests: [
						{
							args: ["https://www.dropbox.com/s/5fsvey23bi0v8lf/myfile.json?dl=0", {host: "*.dropbox.com"}],
							expect: true,
						},
					]
				},
				{
					name: "Coda Backends",
					tests: [
						{
							name: "API",
							tests: [
								{
									args: ["https://coda.io/apis/v1/docs.coda.io/docs/test-api", {host: "coda.io", path: "/apis/v1/"}],
									expect: true,
								},
							],
						},
						{
							name: "Table",
							tests: [
								{
									args: ["https://coda.io/d/State-of-HTML-Planning_dTGBFYq175J/All-considered-features_suY7G#In-Part-1_tuBsZ/r1", {host: "coda.io", path: "/d/"}],
									expect: true,
								},
							],
						},
					]
				},
				{
					name: "GitHub Backends",
					tests: [
						{
							name: "API",
							tests: [
								{
									args: ["https://api.github.com/repos/foo/bar/contents/baz.json", {host: "api.github.com"}],
									expect: true,
								},
								{
									args: ["https://api.github.com/graphql#query{viewer { login }}", {host: "api.github.com"}],
									expect: true,
								},
							],
						},
						{
							name: "File",
							tests: [
								{
									args: ["https://github.com/foo/bar/blob/main/baz.json",
										[
											{ host: "github.com" },
											{ host: "raw.githubusercontent.com" }
										]
									],
									expect: true,
								},
								{
									args: ["https://raw.githubusercontent.com/foo/bar/main/baz.json",
										[
											{ host: "github.com" },
											{ host: "raw.githubusercontent.com" }
										]
									],
									expect: true,
								},
							],
						},
						{
							name: "Gist",
							tests: [
								{
									args: ["https://gist.github.com/foo/bar", {host: "gist.github.com"}],
									expect: true,
								},
							],
						},
					]
				},
				{
					name: "Google Backends",
					tests: [
						{
							name: "Google Calendar",
							tests: [
								{
									args: ["https://calendar.google.com/calendar/u/0/r/day", {host: "calendar.google.com"}],
									expect: true,
								},
							],
						},
						{
							name: "Google Drive",
							tests: [
								{
									args: ["https://drive.google.com/file/d/foo/bar", {host: "drive.google.com"}],
									expect: true,
								},
								{
									args: ["https://drive.google.com/drive/u/0/my-drive", {host: "drive.google.com"}],
									expect: true,
								},
							],
						},
						{
							name: "Google Sheets",
							tests: [
								{
									args: ["https://docs.google.com/spreadsheets/d/foo/bar/edit#gid=0", {host: "docs.google.com", path: "/spreadsheets/"}],
									expect: true,
								},
							],
						},
					]
				},
				{
					name: "Firebase Backend",
					tests: [
						{
							args: ["https://foo.firebaseio.com/bar/baz.json",
								[
									{ host: "*.firebaseio.com" },
									{ host: "firebasestorage.googleapis.com" },
								]
							],
							expect: true,
						},
						{
							args: ["https://firebasestorage.googleapis.com/v0/b/madata.appspot.com/o/files%2Ffoo.svg?alt=media&token=bar",
								[
									{ host: "*.firebaseio.com" },
									{ host: "firebasestorage.googleapis.com" },
								]
							],
							expect: true,
						},
					],
				},
			],
		},
	],
};
