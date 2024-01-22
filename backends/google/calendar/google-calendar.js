import Google from "../google.js";

/**
 * Google Calendar backend. Read-only for now.
 * @class GoogleCalendar
 * @extends Google
 * @category Google
 */
export default class GoogleCalendar extends Google {
	async get (file = this.file) {
		let call = `${file.calendarId}/events?key=${this.apiKey}`;

		if (this.options) {
			file.params = Object.assign({}, this.options);
			for (const o of Object.keys(this.options)) {
				// Do not include in the request options not supported by the Google Calendar API
				// to avoid getting the “Bad Request” error if possible.
				if (!GoogleCalendar.supportedOptions.includes(o)) {
					delete file.params[o];
				}
			}

			const params = new URLSearchParams(file.params);
			call = call + "&" + params.toString();
		}

		let calendar;
		try {
			calendar = await this.request(call);
		}
		catch (e) {
			if (e.status === 401) {
				await this.logout(); // Access token we have is invalid. Discard it.
				throw new Error(this.constructor.phrase("access_token_invalid"));
			}

			if (e.status === 400) {
				throw new Error(this.constructor.phrase("bad_options", file.params));
			}

			let error;
			if (e instanceof Response) {
				error = (await e.json()).error.message;
			}
			else {
				error = e.message;
			}

			throw new Error(error);
		}

		return calendar?.items;
	}

	static supportedOptions = ["iCalUID", "maxAttendees", "maxResults", "orderBy", "pageToken", "privateExtendedProperty", "q", "sharedExtendedProperty", "showDeleted", "showHiddenInvitations", "singleEvents", "syncToken", "timeMax", "timeMin", "timeZone", "updatedMin"];
	static apiDomain = "https://www.googleapis.com/calendar/v3/calendars/";
	static scopes = ["https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/userinfo.email"];
	static host = "calendar.google.com";

	/**
	 * Parse Calendars URLs.
	 * @param {string} source Calendar URL.
	 * @returns Calendar ID.
	 */
	static parseURL (source) {
		const ret = super.parseURL(source);
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

	static phrases = {
		bad_options: params => {
			let message = "The options you provided might have values not supported by the Google Calendar backend.";

			if (params) {
				message += ` The options were: ${JSON.stringify(params)}.`;
			}

			return message;
		}
	};
}
