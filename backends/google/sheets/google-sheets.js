/**
 * Google Sheets backend.
 * @class GoogleSheets
 * @extends Google
 */
import Google from "../google.js";

export default class GoogleSheets extends Google {
	/**
	 * Read data from the spreadsheet.
	 * @param {string} url Spreadsheet URL.
	 * @returns Spreadsheet data.
	 */
	async get (file) {
		if (file.sheetId !== undefined && !file.sheet || GoogleSheets.#getRangeReference(file) === "") {
			// Sheet title has priority over sheet id
			try {
				const sheetTitle = await this.#getSheetTitle(file);
				if (!sheetTitle) {
					// No (visible) sheet to work with
					console.warn(this.constructor.phrase("get_no_sheet"));
					return null;
				}

				file.sheet = sheetTitle;
			}
			catch (e) {
				if (e.status === 401) {
					await this.logout(); // Access token we have is invalid. Discard it.
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
		}

		const rangeReference = GoogleSheets.#getRangeReference(file);
		let call = `${file.id}/values/${rangeReference}/?key=${this.apiKey}&majorDimension=${this.options.transpose? "columns" : "rows"}&valueRenderOption=unformatted_value`;
		if (this.options.serializeDates) {
			call += "&dateTimeRenderOption=formatted_string";
		}

		try {
			const response = await this.request(call);
			const values = response.values;

			if (!this.options.headerRow && !this.options.keys) {
				// Return an array of arrays.
				return values;
			}

			file.objectKeys = new Map(); // "string" => "string"
			if (this.options.headerRow) {
				// The sheet has a header row. Use the headers from the sheet (from the first row) as object keys.
				// We don't want headers to become a part of the data.
				file.headers = values.shift();
				file.objectKeys = new Map(Object.entries(file.headers));
			}

			if (this.options.keys) {
				// Use the provided keys as object keys.
				const keys = this.options.keys;
				if (Array.isArray(keys)) {
					// Keys are in an array
					file.objectKeys = new Map(Object.entries(keys));
				}
				else if (typeof keys === "function") {
					// We have a mapping function. The function should return an object key
					// and take header text, column index, and array of headers as arguments.
					if (file.headers) {
						const headerRow = file.headers;
						for (let columnIndex = 0; columnIndex < headerRow.length; columnIndex++) {
							file.objectKeys.set(columnIndex + "", keys(headerRow[columnIndex], columnIndex, headerRow));
						}
					}
					else {
						// No header row. We need as many object keys as there are cells in the longest row.
						const maxIndex = Math.max(...values.map(row => row.length));
						for (let columnIndex = 0; columnIndex < maxIndex; columnIndex++) {
							file.objectKeys.set(columnIndex + "", keys(undefined, columnIndex));
						}
					}
				}
			}

			// Return an array of objects instead of an array of arrays.
			const ret = [];
			for (const row of values) {
				const obj = {};

				for (let columnIndex = 0; columnIndex < row.length; columnIndex++) {
					const index = columnIndex + "";
					obj[file.objectKeys.get(index) ?? index] = row[columnIndex];
				}

				ret.push(obj);
			}

			return ret;
		}
		catch (e) {
			if (e.status === 401) {
				await this.logout(); // Access token we have is invalid. Discard it.
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
	}

	/**
	 * Save data to the spreadsheet.
	 * @param {*} data Data to save.
	 * @param {Object} file Spreadsheet to work with.
	 * @param {Object} options Options: sheet, range.
	 */
	async put (data, {file = this.file, ...options} = {}) {
		file = Object.assign({}, file, {...options});

		const rangeReference = GoogleSheets.#getRangeReference(file);
		let call = `${file.id}/values/${rangeReference}?key=${this.apiKey}&valueInputOption=user_entered&responseValueRenderOption=unformatted_value&includeValuesInResponse=true`;
		if (this.options.serializeDates) {
			call += "&responseDateTimeRenderOption=formatted_string";
		}

		if (this.options.headerRow === true || this.options.keys) {
			// Reverse the objectKeys map
			const columnNumbers = new Map([...file.objectKeys].map(([index, key]) => [key, index]));

			// Transform an array of objects into an array of arrays.
			// We must preserve the columns' source order.
			data = data.map(obj => {
				const ret = [];
				const newData = [];

				for (const key of Object.keys(obj)) {
					const index = Number(columnNumbers.get(key) ?? key); // Why “?? key”? Handle the case when object keys are already column indices (e.g., when keys: []).

					if (index >= 0) {
						// The existing key
						ret[index] = obj[key];
					}
					else {
						// If objects have “new” keys, e.g., the user wants to add new columns with data,
						// add them to the end of the corresponding row.
						newData.push(obj[key]);
					}
				}

				ret.push(...newData)

				return ret;
			});

			if (file.headers) {
				// We have a header row. This row is not a part of the data, so we need to add it.
				// Cells of this row must stay untouched to not mess up the version history.
				const headerRow = Array(file.headers.length).fill(null); // [null, null, ..., null]
				data = [headerRow, ...data];
			}
		}

		const body = {
			"range": rangeReference,
			"majorDimension": this.options.transpose ? "columns" : "rows",
			"values": data
		};

		let response;
		try {
			response = await this.request(call, body, "PUT");
		}
		catch (e) {
			if (e.status === 400) {
				if (file.sheet) {
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

							let error;
							if (e instanceof Response) {
								error = (await e.json()).error.message;
							}
							else {
								error = e.message;
							}

							throw new Error(error);
						}
					}

					const sheet = spreadsheet.sheets?.find?.(sheet => sheet.properties?.title === file.sheet);

					if (!sheet && this.options.allowAddingSheets) {
						// There is no. Let's try to create one.
						const req = {
							requests: [
								{
									addSheet: {
										properties: {
											title: file.sheet
										}
									}
								}
							]
						};

						try {
							await this.request(`${file.id}:batchUpdate`, req, "POST");

							// Warn about the newly created sheet.
							console.warn(this.constructor.phrase("store_sheet_added", file.sheet));

							// Let's try to write data one more time.
							response = await this.request(call, body, "PUT");
						}
						catch (e) {
							if (e.status === 401) {
								await this.logout(); // Access token we have is invalid. Discard it.
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
					}
					else {
						throw new Error(this.constructor.phrase("store_no_sheet", file.sheet));
					}
				}
			}
			else {
				if (e.status === 401) {
					await this.logout(); // Access token we have is invalid. Discard it.
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
	 * Get an object key taking into account that there might be duplicates among column headers.
	 * @param {string} header Header text.
	 * @param {number} index Column index (zero-based).
	 * @param {[string]} headers Array of column headers.
	 * @returns {string} Object key.
	 */
	static keys = (header, index, headers) => {
		// Find duplicates.
		let count = 0;
		for (let j = 0; j < index; j++) {
			if (headers[j] === header) {
				count++;
			}
		}

		return count === 0? header : header + (count + 1);
	}

	/**
	 * Get the range reference.
	 * @static
	 * @private
	 * @param {string} sheet Sheet title.
	 * @param {string} range Range in the A1 notation.
	 * @returns The range reference in one of the supported formats: 'Sheet title'!Range, 'Sheet title', or Range.
	 */
	static #getRangeReference ({sheet, range} = file) {
		return `${sheet ? `'${sheet}'` : ""}${range ? (sheet ? `!${range}` : range) : ""}`
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

			let error;
			if (e instanceof Response) {
				error = (await e.json()).error.message;
			}
			else {
				error = e.message;
			}

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
	static scopes = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/userinfo.email"];

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
			sheet: undefined,
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
		get_no_sheet: "We could not find the sheet to get data from. Try providing the sheet option with the sheet title.",
		store_no_sheet: sheet => `We could not find the ${sheet} sheet in the spreadsheet. Try enabling the allowAddingSheets option to create it.`,
		store_sheet_added: sheet => `We could not find the ${sheet} sheet in the spreadsheet and created it.`
	}
}