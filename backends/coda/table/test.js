import {default as CodaTable} from "./coda-table.js";

export default {
	name: "CodaTable",
	description: "These tests validate the CodaTable backend implementation.",
	tests: [
		{
			name: "URL parsing",
			description: "These tests test whether CodaTable.parseURL() produces correct results.",
			run (source) {
				const ret = CodaTable.parseURL(source);
				delete ret.url;

				return ret;
			},
			tests: [
				{
					arg: "https://coda.io/d/State-of-HTML-Planning_dTGBFYq175J/All-considered-features_suY7G#In-Part-1_tuBsZ/r1",
					expect: {docId: "TGBFYq175J", tentativePageId: "_suY7G"},
				},
				{
					arg: "https://coda.io/apis/v1/docs/AbCDeFGH/tables/grid-pqRst-U",
					expect: {docId: "AbCDeFGH", tableId: "grid-pqRst-U"},
				},
			],
		},
	],
};
