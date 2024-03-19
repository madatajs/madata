import Backend from "../src/backend.js";

const backends = {
	"Local": [
		"local:foo",
	],
	"Remote": [
		"https://foo.bar/baz.json",
	],
	"Coda API": [
		"https://coda.io/apis/v1/docs/TGBFYq175J/tables/grid-pqRst-U",
	],
	"Coda Table": [
		"https://coda.io/d/State-of-HTML-Planning_dTGBFYq175J/All-considered-features_suY7G#In-Part-1_tuBsZ/r1",
	],
	"Dropbox": [
		"https://www.dropbox.com/s/1234567890abcdef/foo.json?dl=0",
		"https://www.dropbox.com/scl/fo/752m5qrcrfyt8zz20mlgn/h?dl=0&rlkey=aqku3p768iiw6qbftu8yq8v3d",
	],
	// It's still the same issue with Firebase. Error [ERR_UNSUPPORTED_ESM_URL_SCHEME]: Only URLs with a scheme in: file, data, and node are supported by the default ESM loader.)
	// "Firebase": [
	// 	"https://foo.firebaseio.com/bar/baz.json",
	// 	"https://firebasestorage.googleapis.com/v0/b/madata.appspot.com/o/files%2Ffoo.svg?alt=media&token=bar",
	// 	"gs://foo.appspot.com/firebaseupload/images/bar.svg",
	// ],
	"Github API": [
		"https://api.github.com/repos/mavoweb/mavo/commits/ed03ff78fa6e2cb38af1901ab379e205419b24aa",
		"https://api.github.com/repos/foo/bar/contents/baz.json",
		"https://api.github.com/user",
		"https://api.github.com/graphql",
		"https://api.github.com/graphql#query{viewer { login }}",
		`https://api.github.com/graphql#query
{viewer
	{ login }}`,
	],
	"Github File": [
		"https://github.com/foo/bar/blob/main/baz.json",
		"https://github.com/foo/bar/baz.json",
		"https://raw.githubusercontent.com/foo/bar/main/baz.json",
		"https://github.com",
	],
	"Github Gist": [
		"https://gist.github.com/foo/eed121799a4118cdc2f139136cf7dbe8",
		"https://gist.github.com/foo/eed121799a4118cdc2f139136cf7dbe8/raw",
		"https://gist.github.com/foo/eed121799a4118cdc2f139136cf7dbe8/raw/bar.json",
		"https://gist.githubusercontent.com/foo/eed121799a4118cdc2f139136cf7dbe8/raw/yolobaz/bar.json",
		"https://gist.githubusercontent.com/foo/eed121799a4118cdc2f139136cf7dbe8/raw/bar.json",
		"https://gist.github.com/foo/NEW",
	],
	"Google Calendar": [
		"https://calendar.google.com/calendar",
		"https://calendar.google.com/calendar/u/0/r/day",
		"https://calendar.google.com/calendar/embed?src=fr.french%23holiday%40group.v.calendar.google.com",
		"https://calendar.google.com/calendar/u/0?cid=cDlkOWxkOXZ2aHNrOXE5M2hhcDQxN2sxZHNAZ3JvdXAuY2FsZW5kYXIuZ29vZ2xlLmNvbQ",
	],
	"Google Drive": [
		"https://drive.google.com/file/d/foo/bar",
		"https://drive.google.com/drive/u/0/my-drive",
		"https://drive.google.com/drive/u/0/folders/1y1Mc_-5NXk0b0PFQCEddXKn715tHu8tm",
		"https://drive.google.com/drive/folders/1At7rPDJvFhUo_SD1FUKmd95HwXjjycJm?usp=drive_link",
	],
	"Google Sheets": [
		"https://docs.google.com/spreadsheets/d/1z6zAHPmiP0T1y1EtSmiYHNAe7mksbFXC_AflELZqZmg/htmlview#gid=0",
		"https://docs.google.com/spreadsheets/d/1IMFDv0aWWZ8F4GIdk_gmOwl60DD4-eCnLEX1CV9WBho/edit#gid=607944837",
		"https://docs.google.com/spreadsheets/d/14bzCuziKutrA3iESarKoj2o56dhraR8pzuFAuwTIo-g/edit?usp=sharing",
	],
};

const fromTests = [];
for (const backend in backends) {
	const urls = backends[backend];
	urls.forEach(url => fromTests.push({ arg: url, expect: backend }));
}

export default {
	name: "Backend",
	tests: [
		{
			name: "Backend.from()",
			description: "These tests test whether Backend.from() produces the correct backend.",
			run (source) {
				const backend = Backend.from(source);

				return backend?.title;
			},
			tests: fromTests,
		},
	],
};
