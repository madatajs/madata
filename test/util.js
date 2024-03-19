import { matchURLs, testURLs, URLPattern } from "../src/util.js";

const urlPatterns = [
	{protocol: "local", pathname: ":key"},
	{hostname: "{*.}?dropbox.com"},
	{hostname: "api.github.com", pathname: "/graphql", hash:":query?"},
	{hostname: "api.github.com", pathname: "/:apiCall(.+)"},
	{hostname: "gist.githubusercontent.com", pathname: "/:owner/:gistId/raw{/:revision}?/:path"},
	{hostname: "calendar.google.com", pathname: "/calendar{/*}?", search: "{cid=:cid}?{src=:src}?"},
	{hostname: "docs.google.com", pathname: "/spreadsheets/d/:id/*", hash: "{gid=:sheetId}?"},
	"https://coda.io/d/*_d:docId/*:tentativePageId(_su.+)",
	"http{s}?://raw.githubusercontent.com/:owner/:repo/:branch/:path(.+)",
];

const urls = [
	"local:foo",
	"https://www.dropbox.com/scl/fo/752m5qrcrfyt8zz20mlgn/h?dl=0&rlkey=aqku3p768iiw6qbftu8yq8v3d",
	"https://api.github.com/user",
	"https://api.github.com/graphql#query{viewer { login }}",
	"https://api.github.com/graphql",
	"https://gist.githubusercontent.com/foo/eed121799a4118cdc2f139136cf7dbe8/raw/yolobaz/bar.json",
	"https://gist.githubusercontent.com/foo/eed121799a4118cdc2f139136cf7dbe8/raw/bar.json",
	"https://calendar.google.com/calendar/u/0/r/day",
	"https://calendar.google.com/calendar/embed?src=fr.french%23holiday%40group.v.calendar.google.com",
	"https://calendar.google.com/calendar/u/0?cid=cDlkOWxkOXZ2aHNrOXE5M2hhcDQxN2sxZHNAZ3JvdXAuY2FsZW5kYXIuZ29vZ2xlLmNvbQ",
	"https://docs.google.com/spreadsheets/d/1IMFDv0aWWZ8F4GIdk_gmOwl60DD4-eCnLEX1CV9WBho/edit#gid=607944837",
	"https://docs.google.com/spreadsheets/d/14bzCuziKutrA3iESarKoj2o56dhraR8pzuFAuwTIo-g/edit?usp=sharing",
	"https://coda.io/d/State-of-HTML-Planning_dTGBFYq175J/All-considered-features_suY7G#In-Part-1_tuBsZ/r1",
	"https://raw.githubusercontent.com/foo/bar/main/baz.json",
];

const tests = urls.map(source => ({ args: [source, urlPatterns] }));

export default {
	name: "Util",
	description: "These tests test whether Madata utility functions produce correct results.",
	tests: [
		{
			name: "testURLs()",
			run: testURLs,
			expect: true,
			tests: [
				{
					name: "Basic",
					tests: [
						{
							name: "No source",
							arg: undefined,
							expect: false,
						},
						{
							name: "No URLs",
							arg: "https://example.com/foo/bar",
							expect: false,
						},
						{
							name: "URL is a string",
							args: ["https://example.com/foo/bar", ["https://example.com/foo/bar"]],
						},
						{
							name: "URL is an object literal",
							args: ["https://example.com/foo/bar", [{protocol: "https:", hostname: "example.com", pathname: "/foo/bar"}]],
						},
						{
							name: "URL is an instance of URLPattern",
							args: ["https://example.com/foo/bar", [new URLPattern({protocol: "https:", hostname: "example.com", pathname: "/foo/bar"})]],
						},
					],
				},
				...tests,
			],
		},
		{
			name: "matchURLs()",
			run: (source, urls) => matchURLs(source, urls) !== null,
			expect: true,
			tests: [
				{
					name: "Basic",
					tests: [
						{
							name: "No URLs",
							arg: "https://example.com/foo/bar",
							expect: false,
						},
						{
							name: "URL is a string",
							args: ["https://example.com/foo/bar", ["https://example.com/foo/bar"]],
						},
						{
							name: "URL is an object literal",
							args: ["https://example.com/foo/bar", [{protocol: "https:", hostname: "example.com", pathname: "/foo/bar"}]],
						},
						{
							name: "URL is an instance of URLPattern",
							args: ["https://example.com/foo/bar", [new URLPattern({protocol: "https:", hostname: "example.com", pathname: "/foo/bar"})]],
						},
					],
				},
				...tests,
			],
		},
	],
};
