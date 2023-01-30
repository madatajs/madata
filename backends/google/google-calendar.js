/**
 * Google Calendar backend. Read-only for now.
 * @class GoogleCalendar
 * @extends Google
 */
import Google from "./google.js";

export default class GoogleCalendar extends Google {
	async get (file) {
		let call = `${file.calendarId}/events?key=${this.apiKey}`;

		if (this.options.options) {
			const params = new URLSearchParams(this.options.options);
			call = call + "&" + params.toString();
		}

		let calendar;
		try {
			calendar = await this.request(call);
		}
		catch (e) {
			if (e.status === 401) {
				await this.logout(); // Access token we have is invalid. Discard it.
			}

			const error = (await e.json()).error.message;
			throw new Error(error);
		}

		return calendar.items;
	}

	static apiDomain = "https://www.googleapis.com/calendar/v3/calendars/";
	static scopes = ["https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/userinfo.profile"];

	static test (url) {
		url = new URL(url);
		return url.host === "calendar.google.com";
	}

	/**
	 * Parse Calendars URLs.
	 * @param {string} source Calendar URL.
	 * @returns Calendar ID.
	 */
	static parseURL (source) {
		const ret = {
			url: new URL(source)
		};
		const params = ret.url.searchParams;

		let calendarId;
		// Order matters: shareable link, public URL, or the user's primary calendar.
		if (params.has("cid")) {
			calendarId = decodeURIComponent(atob(params.get("cid")));
		}
		else {
			calendarId = params.get("src") ?? "primary";
		}

		ret.calendarId = encodeURIComponent(calendarId);

		return ret;
	}
}