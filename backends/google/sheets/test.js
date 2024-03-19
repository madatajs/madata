import {default as GoogleSheets} from "./google-sheets.js";

export default {
	name: "GoogleSheets",
	description: "These tests validate the GoogleSheets backend implementation.",
	tests: [
		{
			name: "URL parsing",
			description: "These tests test whether GoogleSheets.parseURL() produces correct results.",
			run (source) {
				const ret = GoogleSheets.parseURL(source);
				delete ret.url;

				return ret;
			},
			tests: [
				{
					arg: "https://docs.google.com/spreadsheets/d/1z6zAHPmiP0T1y1EtSmiYHNAe7mksbFXC_AflELZqZmg/htmlview#gid=0",
					expect: {id: "1z6zAHPmiP0T1y1EtSmiYHNAe7mksbFXC_AflELZqZmg", "sheetId": 0, "sheet": undefined, "range": undefined},
				},
				{
					arg: "https://docs.google.com/spreadsheets/d/1IMFDv0aWWZ8F4GIdk_gmOwl60DD4-eCnLEX1CV9WBho/edit#gid=607944837",
					expect: {id: "1IMFDv0aWWZ8F4GIdk_gmOwl60DD4-eCnLEX1CV9WBho", "sheetId": 607944837, "sheet": undefined, "range": undefined},
				},
				{
					arg: "https://docs.google.com/spreadsheets/d/14bzCuziKutrA3iESarKoj2o56dhraR8pzuFAuwTIo-g/edit?usp=sharing",
					expect: {id: "14bzCuziKutrA3iESarKoj2o56dhraR8pzuFAuwTIo-g", "sheetId": undefined, "sheet": undefined, "range": undefined},
				},
			],
		},
	],
};
