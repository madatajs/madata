// Firebase doesn't work in node.
// Error [ERR_UNSUPPORTED_ESM_URL_SCHEME]: Only URLs with a scheme in: file, data, and node are supported by the default ESM loader.)

// import {default as Firebase} from "./index.js";

// export default {
// 	name: "Firebase",
// 	description: "These tests validate the Firebase backend implementation.",
// 	tests: [
// 		{
// 			name: "URL parsing",
// 			description: "These tests test whether Firebase.parseURL() produces correct results.",
// 			run (source) {
// 				const ret = Firebase.parseURL(source);
// 				delete ret.url;

// 				return ret;
// 			},
// 			tests: [
// 				{
// 					arg: "https://foo.firebaseio.com/bar/baz.json",
// 					expect: {projectId: "foo", authDomain: "foo.firebaseapp.com", storageBucket: "foo.appspot.com"},
// 				},
// 				{
// 					arg: "https://firebasestorage.googleapis.com/v0/b/madata.appspot.com/o/files%2Ffoo.svg?alt=media&token=bar",
// 					expect: {inStorage: true, path: "https://firebasestorage.googleapis.com/v0/b/madata.appspot.com/o/files%2Ffoo.svg?alt=media&token=bar"},
// 				},
// 				{ arg: "gs://foo.appspot.com/firebaseupload/images/bar.svg",
// 					expect: {inStorage: true, path: "gs://foo.appspot.com/firebaseupload/images/bar.svg"},
// 				},
// 			],
// 		},
// 	],
// };
