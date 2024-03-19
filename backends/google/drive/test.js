import {default as GoogleDrive} from "./google-drive.js";

export default {
	name: "GoogleDrive",
	description: "These tests validate the GoogleDrive backend implementation.",
	tests: [
		{
			name: "URL parsing",
			description: "These tests test whether GoogleDrive.parseURL() produces correct results.",
			run (source) {
				const ret = GoogleDrive.parseURL(source);
				delete ret.url;

				return ret;
			},
			tests: [
				{
					arg: "https://drive.google.com/file/d/foo/bar",
					expect: {
						id: "foo",
						filename: GoogleDrive.defaults.filename,
						folder: undefined,
						fields: GoogleDrive.defaults.fields,
					},
				},
				{
					arg: "https://drive.google.com/drive/u/0/my-drive",
					expect: {
						filename: GoogleDrive.defaults.filename,
						folder: undefined,
						fields: GoogleDrive.defaults.fields,
					},
				},
				{
					arg: "https://drive.google.com/drive/u/0/folders/1y1Mc_-5NXk0b0PFQCEddXKn715tHu8tm",
					expect: {
						filename: GoogleDrive.defaults.filename,
						folder: "https://drive.google.com/drive/u/0/folders/1y1Mc_-5NXk0b0PFQCEddXKn715tHu8tm",
						folderId: "1y1Mc_-5NXk0b0PFQCEddXKn715tHu8tm",
						fields: GoogleDrive.defaults.fields,
					},
				},
				{
					arg: "https://drive.google.com/drive/folders/1At7rPDJvFhUo_SD1FUKmd95HwXjjycJm?usp=drive_link",
					expect: {
						filename: GoogleDrive.defaults.filename,
						folder: "https://drive.google.com/drive/folders/1At7rPDJvFhUo_SD1FUKmd95HwXjjycJm?usp=drive_link",
						folderId: "1At7rPDJvFhUo_SD1FUKmd95HwXjjycJm",
						fields: GoogleDrive.defaults.fields,
					},
				},
			],
		},
	],
};
