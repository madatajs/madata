/**
 * Google Sheets backend.
 * @class GoogleSheets
 * @extends Google
 */
import Google from "./google.js";

export default class GoogleSheets extends Google {
	/**
	 * Read data from the spreadsheet.
	 * @param {string} url Spreadsheet URL.
	 * @returns Spreadsheet data.
	 */
	async get (file) {
		if (file.sheetId !== undefined && !file.sheetTitle || GoogleSheets.#getRangeReference(file) === "") {
			// Sheet title has priority over sheet id
			try {
				const sheetTitle = await this.#getSheetTitle(file);
				if (!sheetTitle) {
					// No (visible) sheet to work with
					console.warn(this.constructor.phrase("get_no_sheet"));
					return null;
				}

				this.file.sheetTitle = file.sheetTitle = sheetTitle;
			}
			catch (e) {
				if (e.status === 401) {
					await this.logout(); // Access token we have is invalid. Discard it.
				}

				const error = (await e.json()).error.message;
				throw new Error(error);
			}
		}

		const rangeReference = GoogleSheets.#getRangeReference(file);
		let call = `${file.id}/values/${rangeReference}/?key=${this.apiKey}&majorDimension=rows&valueRenderOption=unformatted_value`;
		if (this.options.serializeDates) {
			call += "&dateTimeRenderOption=formatted_string";
		}

		try {
			const response = await this.request(call);
			return response.values;
		} catch (e) {
			if (e.status === 401) {
				await this.logout(); // Access token we have is invalid. Discard it.
			}

			const error = (await e.json()).error.message;
			throw new Error(error);
		}
	}

	/**
	 * Save data to the spreadsheet.
	 * @param {*} data Data to save.
	 * @param {Object} file Spreadsheet to work with.
	 * @param {Object} options Options: sheetTitle, range.
	 */
	async put (data, {file = this.file, ...options} = {}) {
		file = Object.assign({}, file, {...options});

		const rangeReference = GoogleSheets.#getRangeReference(file);
		let call = `${file.id}/values/${rangeReference}?key=${this.apiKey}&valueInputOption=user_entered&responseValueRenderOption=unformatted_value&includeValuesInResponse=true`;
		if (this.options.serializeDates) {
			call += "&responseDateTimeRenderOption=formatted_string";
		}

		const body = {
			"range": rangeReference,
			"majorDimension": "rows",
			"values": data
		};

		let response;
		try {
			response = await this.request(call, body, "PUT");
		}
		catch (e) {
			if (e.status === 400) {
				if (file.sheetTitle) {
					// It might be there is no sheet with the specified title.
					// Let's check it.
					let spreadsheet;
					if (!this.spreadsheet) {
						try {
							this.spreadsheet = spreadsheet = await this.request(file.id);
						}
						catch (e) {
							if (e.status === 401) {
								await this.logout(); // Access token we have is invalid. Discard it.
							}

							const error = (await e.json()).error.message;
							throw new Error(error);
						}
					}

					const sheet = spreadsheet.sheets?.find?.(sheet => sheet.properties?.title === file.sheetTitle);

					if (!sheet && this.options.allowAddingSheets) {
						// There is no. Let's try to create one.
						const req = {
							requests: [
								{
									addSheet: {
										properties: {
											title: file.sheetTitle
										}
									}
								}
							]
						};

						try {
							await this.request(`${file.id}:batchUpdate`, req, "POST");

							// Warn about the newly created sheet.
							console.warn(this.constructor.phrase("store_sheet_added", file.sheetTitle));

							// Let's try to write data one more time.
							response = await this.request(call, body, "PUT");
						}
						catch (e) {
							if (e.status === 401) {
								await this.logout(); // Access token we have is invalid. Discard it.
							}

							const error = (await e.json()).error.message;
							throw new Error(error);
						}
					}
					else {
						throw new Error(this.constructor.phrase("store_no_sheet", file.sheetTitle));
					}
				}
			}
			else {
				if (e.status === 401) {
					await this.logout(); // Access token we have is invalid. Discard it.
				}

				const error = (await e.json()).error.message;
				throw new Error(error);
			}
		}

		return response;
	}

	async login (...args) {
		const user = await super.login(...args);

		if (user) {
			this.updatePermissions({edit: true, save: true});
		}

		return user;
	}

	stringify = data => data
	parse = data => data

	/**
	 * Get the range reference.
	 * @static
	 * @private
	 * @param {string} sheetTitle Sheet title.
	 * @param {string} range Range in the A1 notation.
	 * @returns The range reference in one of the supported formats: 'Sheet title'!Range, 'Sheet title', or Range.
	 */
	static #getRangeReference ({sheetTitle, range} = file) {
		return `${sheetTitle ? `'${sheetTitle}'` : ""}${range ? (sheetTitle ? `!${range}` : range) : ""}`
	}

	/**
	 * Get title of the sheet in the spreadsheet.
	 * @private
	 * @param {Object} file Spreadsheet to work with.
	 * @returns Sheet title or title of the first visible sheet, or null if there are no (visible) sheets to work with.
	 */
	async #getSheetTitle (file = this.file) {
		const call = `${file.id}/?key=${this.apiKey}`;

		let spreadsheet;
		try {
			// Store the spreadsheet for future use (to avoid extra network requests).
			this.spreadsheet = spreadsheet = await this.request(call);
		}
		catch (e) {
			if (e.status === 401) {
				await this.logout(); // Access token we have is invalid. Discard it.
			}

			const error = (await e.json()).error.message;
			throw new Error(error);
		}

		let sheet;
		if (file.sheetId) {
			// Get sheet title by its id.
			sheet = spreadsheet.sheets?.find?.(sheet => sheet.properties?.sheetId === file.sheetId);
		}
		else {
			// Get the first visible sheet (if any).
			sheet = spreadsheet.sheets?.find?.(sheet => !sheet.properties?.hidden);
		}

		return sheet?.properties?.title;
	}

	static apiDomain = "https://sheets.googleapis.com/v4/spreadsheets/";
	static scopes = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/userinfo.profile"];

	static test (url) {
		return url.startsWith("https://docs.google.com/spreadsheets/");
	}

	/**
	 * Parse spreadsheets URLs.
	 * @param {string} source Spreadsheet URL.
	 * @returns Spreadsheet ID, sheet ID, sheet title, range.
	 */
	static parseURL (source) {
		const ret = {
			url: new URL(source),
			sheetId: undefined,
			sheetTitle: undefined,
			range: undefined
		};
		const path = ret.url.pathname.slice(1).split("/");
		const hash = ret.url.hash;

		ret.id = path[2];
		if (hash && hash.startsWith("#gid=")) {
			ret.sheetId = +hash.slice(5);
		}

		return ret;
	}

	static phrases = {
		get_no_sheet: "We could not find the sheet to get data from. Try providing the sheetTitle option with the sheet title.",
		store_no_sheet: sheet => `We could not find the ${sheet} sheet in the spreadsheet. Try enabling the allowAddingSheets option to create it.`,
		store_sheet_added: sheet => `We could not find the ${sheet} sheet in the spreadsheet and created it.`
	}
}