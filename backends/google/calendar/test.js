import {default as GoogleCalendar} from "./google-calendar.js";

export default {
	name: "GoogleCalendar",
	description: "These tests validate the GoogleCalendar backend implementation.",
	tests: [
		{
			name: "URL parsing",
			description: "These tests test whether GoogleCalendar.parseURL() produces correct results.",
			run (source) {
				const ret = GoogleCalendar.parseURL(source);
				delete ret.url;

				return ret;
			},
			tests: [
				{
					arg: "https://calendar.google.com/calendar",
					expect: {"calendarId": "primary", cid: undefined, src: undefined},
				},
				{
					arg: "https://calendar.google.com/calendar/u/0/r/day",
					expect: {"calendarId": "primary", cid: undefined, src: undefined},
				},
				{
					arg: "https://calendar.google.com/calendar/embed?src=fr.french%23holiday%40group.v.calendar.google.com",
					expect: {"calendarId": "fr.french%23holiday%40group.v.calendar.google.com", cid: undefined, src: "fr.french%23holiday%40group.v.calendar.google.com"},
				},
				{
					arg: "https://calendar.google.com/calendar/u/0?cid=cDlkOWxkOXZ2aHNrOXE5M2hhcDQxN2sxZHNAZ3JvdXAuY2FsZW5kYXIuZ29vZ2xlLmNvbQ",
					expect: {"calendarId": "p9d9ld9vvhsk9q93hap417k1ds@group.calendar.google.com", cid: "cDlkOWxkOXZ2aHNrOXE5M2hhcDQxN2sxZHNAZ3JvdXAuY2FsZW5kYXIuZ29vZ2xlLmNvbQ", src: undefined},
				},
			],
		},
	],
};
