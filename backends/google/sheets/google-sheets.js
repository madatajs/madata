import Google from "../google.js";

/**
 * Google Sheets backend.
 * @category Google
 */
export default class GoogleSheets extends Google {
	/**
	 * Read data from the spreadsheet.
	 * @param {string} ref Spreadsheet to work with.
	 * @param {object} o Arbitrary options.
	 * @returns Spreadsheet data.
	 */
	async get (ref = this.ref, o = {}) {
		if ((ref.sheetId !== undefined || this.options.sheetIndex !== undefined) && (!ref.sheet || o.ignoreSheetTitle)
		     || GoogleSheets.#getRangeReference(ref) === "") {
			// Sheet title has priority over sheet id
			try {
				const sheetTitle = await this.#getSheetTitle(ref);
				if (!sheetTitle) {
					// No (visible) sheet to work with
					console.warn(this.constructor.phrase("get_no_sheet"));
					return null;
				}

				ref.sheet = sheetTitle;
			}
			catch ({ error }) {
				if (error.code === 401) {
					await this.logout(); // Access token we have is invalid. Discard it.
					throw new Error(this.constructor.phrase("access_token_invalid"));
				}

				throw new Error(error.message);
			}
		}

		const rangeReference = GoogleSheets.#getRangeReference(ref);
		let call = `${ref.id}/values/${rangeReference}/?key=${this.apiKey}&majorDimension=${this.options.transpose ? "columns" : "rows"}&valueRenderOption=unformatted_value`;
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

			ref.objectKeys = new Map(); // "string" => "string"
			if (this.options.headerRow) {
				// The sheet has a header row. Use the headers from the sheet (from the first row) as object keys.
				// We don't want headers to become a part of the data.
				ref.headers = values.shift();
				ref.objectKeys = new Map(Object.entries(ref.headers));
			}

			if (this.options.keys) {
				// Use the provided keys as object keys.
				const keys = this.options.keys;
				if (Array.isArray(keys)) {
					// Keys are in an array
					ref.objectKeys = new Map(Object.entries(keys));
				}
				else if (typeof keys === "function") {
					// We have a mapping function. The function should return an object key
					// and take header text, column index, and array of headers as arguments.
					if (ref.headers) {
						const headerRow = ref.headers;
						for (let columnIndex = 0; columnIndex < headerRow.length; columnIndex++) {
							ref.objectKeys.set(columnIndex + "", keys(headerRow[columnIndex], columnIndex, headerRow));
						}
					}
					else {
						// No header row. We need as many object keys as there are cells in the longest row.
						const maxIndex = Math.max(...values.map(row => row.length));
						for (let columnIndex = 0; columnIndex < maxIndex; columnIndex++) {
							ref.objectKeys.set(columnIndex + "", keys(undefined, columnIndex));
						}
					}
				}
			}

			return GoogleSheets.#toObjects(ref.objectKeys, values);
		}
		catch ({ error }) {
			if (error.code === 401) {
				await this.logout(); // Access token we have is invalid. Discard it.
				throw new Error(this.constructor.phrase("access_token_invalid"));
			}
			else if (error.code === 400) {
				const message = error.message;

				if (message.startsWith("Unable to parse range:")) {
					// Invalid sheet name and/or data range
					console.warn(this.constructor.phrase("get_no_sheet_or_invalid_range", ref.sheet, ref.range, this.options.sheetIndex));

					if (ref.sheet && this.options.sheetIndex !== undefined) {
						// There is no sheet with the specified title. However the author provided a sheet index, too.
						// Let's try to get data from the sheet with the specified index.
						return this.get(this.ref, { ignoreSheetTitle: true });
					}
				}
				else {
					// No spreadsheet (e.g., invalid URL)
					console.warn(this.constructor.phrase("get_no_spreadsheet", this.source));
				}

				return null;
			}

			throw new Error(error.message);
		}
	}

	/**
	 * Save data to the spreadsheet.
	 * @param {*} data Data to save.
	 * @param {Object} ref Spreadsheet to work with.
	 * @param {Object} options Options: sheet, range.
	 */
	async put (data, {ref = this.ref, ...options} = {}) {
		ref = Object.assign({}, ref, {...options});

		if ((ref.sheetId !== undefined || this.options.sheetIndex !== undefined) && !ref.sheet || GoogleSheets.#getRangeReference(ref) === "") {
			// We need to know the name of a worksheet where to store data.
			try {
				ref.sheet = await this.#getSheetTitle(ref);
			}
			catch ({ error }) {
				if (error.code === 401) {
					await this.logout(); // Access token we have is invalid. Discard it.
					throw new Error(this.constructor.phrase("access_token_invalid"));
				}

				throw new Error(error.message);
			}
		}

		const rangeReference = GoogleSheets.#getRangeReference(ref);
		let call = `${ref.id}/values/${rangeReference}?key=${this.apiKey}&valueInputOption=${this.options.smartValues ? "user_entered" : "raw"}&responseValueRenderOption=unformatted_value&includeValuesInResponse=true`;
		if (this.options.serializeDates) {
			call += "&responseDateTimeRenderOption=formatted_string";
		}

		if (!ref.objectKeys && data.some(el => !Array.isArray(el))) {
			ref.objectKeys = new Map();
		}

		if (ref.objectKeys) {
			// We have an array of objects and must transform it into an array of arrays as Google API demands.
			data = GoogleSheets.#fromObjects(ref.objectKeys, data);

			if (ref.headers) {
				// We have a header row. This row is not a part of the data, so we need to add it.
				// Cells of this row must stay untouched to not mess up the version history.
				const headerRow = Array(ref.headers.length).fill(null); // [null, null, ..., null]
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
		catch ({ error }) {
			if (error.code === 400) {
				if (ref.sheet) {
					// It might be there is no sheet with the specified title.
					// Let's check it.
					let spreadsheet;
					if (!this.spreadsheet) {
						try {
							this.spreadsheet = spreadsheet = await this.request(ref.id);
						}
						catch ({ error }) {
							if (error.code === 401) {
								await this.logout(); // Access token we have is invalid. Discard it.
								throw new Error(this.constructor.phrase("access_token_invalid"));
							}

							throw new Error(error.message);
						}
					}

					const sheet = spreadsheet.sheets?.find?.(sheet => sheet.properties?.title === ref.sheet);

					if (!sheet && this.options.allowAddingSheets) {
						// There is no. Let's try to create one.
						const req = {
							requests: [
								{
									addSheet: {
										properties: {
											title: ref.sheet
										}
									}
								}
							]
						};

						try {
							await this.request(`${ref.id}:batchUpdate`, req, "POST");

							// Warn about the newly created sheet.
							console.warn(this.constructor.phrase("store_sheet_added", ref.sheet));

							// Let's try to write data one more time.
							response = await this.request(call, body, "PUT");
						}
						catch ({ error }) {
							if (error.code === 401) {
								await this.logout(); // Access token we have is invalid. Discard it.
								throw new Error(this.constructor.phrase("access_token_invalid"));
							}

							throw new Error(error.message);
						}
					}
					else {
						throw new Error(this.constructor.phrase("store_no_sheet", ref.sheet));
					}
				}
			}
			else {
				if (error.code === 401) {
					await this.logout(); // Access token we have is invalid. Discard it.
					throw new Error(this.constructor.phrase("access_token_invalid"));
				}

				throw new Error(error.message);
			}
		}

		// Updated (stored) data should have the format as the one in the get() method.
		if (response.updatedData?.values && ref.objectKeys) {
			const values = response.updatedData.values;
			if (this.options.headerRow === true) {
				// The header row shouldn't be a part of the data.
				values.shift();
			}

			response.updatedData.values = GoogleSheets.#toObjects(ref.objectKeys, values);
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

	stringify = data => data;
	parse = data => data;

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

		return count === 0 ? header : header + (count + 1);
	};

	/**
	 * Get the range reference.
	 * @param {string} sheet Sheet title.
	 * @param {string} range Range in the A1 notation.
	 * @returns The range reference in one of the supported formats: 'Sheet title'!Range, 'Sheet title', or Range.
	 */
	static #getRangeReference ({sheet, range} = {}) {
		return `${sheet ? `'${sheet}'` : ""}${range ? (sheet ? `!${range}` : range) : ""}`;
	}

	/**
	 * Get title of the sheet in the spreadsheet.
	 * @param {Object} ref Spreadsheet to work with.
	 * @returns Sheet title or title of the first visible sheet, or null if there are no (visible) sheets to work with.
	 */
	async #getSheetTitle (ref = this.ref) {
		const call = `${ref.id}/?key=${this.apiKey}`;

		let spreadsheet;
		try {
			// Store the spreadsheet for future use (to avoid extra network requests).
			this.spreadsheet = spreadsheet = await this.request(call);
		}
		catch ({ error }) {
			if (error.code === 401) {
				await this.logout(); // Access token we have is invalid. Discard it.
				throw new Error(this.constructor.phrase("access_token_invalid"));
			}

			throw new Error(error.message);
		}

		let sheet;
		if (this.options.sheetIndex !== undefined) {
			const sheetIndex = Number(this.options.sheetIndex);
			const sheetsCount = spreadsheet.sheets?.length;

			if (sheetsCount && sheetIndex >= 0 && sheetIndex < sheetsCount) {
				// Get sheet title by its index.
				sheet = spreadsheet.sheets[sheetIndex];
				ref.sheetIndex = sheetIndex;
			}
		}
		else if (ref.sheetId) {
			// Get sheet title by its id.
			sheet = spreadsheet.sheets?.find?.(sheet => sheet.properties?.sheetId === ref.sheetId);
		}
		else {
			// Get the first visible sheet (if any).
			sheet = spreadsheet.sheets?.find?.(sheet => !sheet.properties?.hidden);
		}

		return sheet?.properties?.title;
	}

	/**
	 * Transform an array of objects to an array of arrays.
	 * @param {Map<string, string>} keys A map between column indices and object keys.
	 * @param {Array<Object>} values An array of objects. Each object corresponds to an individual spreadsheet row.
	 * @returns {Array<Array<any>>} An array of arrays. Each nested array corresponds to an individual spreadsheet row.
	 */
	static #fromObjects (keys, values) {
		// Reverse the keys map
		const columnNumbers = new Map([...keys].map(([index, key]) => [key, index]));

		return values.map(obj => {
			const ret = [];
			const newData = [];

			for (const key of Object.keys(obj)) {
				// We must preserve the columns' source order.
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

			ret.push(...newData);

			return ret;
		});
	}

	/**
	 * Transform an array of arrays to an array of objects.
	 * @param {Map<string, string>} keys A map between column indices and object keys.
	 * @param {Array<Array<any>>} values An array of values from a spreadsheet. Each nested array corresponds to an individual spreadsheet row.
	 * @returns {Array<Object>} An array of objects. Each object corresponds to an individual spreadsheet row.
	 */
	static #toObjects (keys, values) {
		const ret = [];

		for (const row of values) {
			const obj = {};

			for (let columnIndex = 0; columnIndex < row.length; columnIndex++) {
				const index = columnIndex + "";
				obj[keys.get(index) ?? index] = row[columnIndex];
			}

			ret.push(obj);
		}

		return ret;
	}

	static apiDomain = "https://sheets.googleapis.com/v4/spreadsheets/";
	static scopes = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/userinfo.email"];

	static host = "docs.google.com";
	static path = "/spreadsheets/";

	/**
	 * Parse spreadsheets URLs.
	 * @param {string} source Spreadsheet URL.
	 * @returns Spreadsheet ID, sheet ID, sheet title, range.
	 */
	static parseURL (source) {
		let ret = Object.assign(super.parseURL(source), {
			sheetId: undefined,
			sheet: undefined,
			range: undefined,
		});

		const path = ret.url.pathname.slice(1).split("/");
		const hash = ret.url.hash;

		ret.id = path[2];
		if (hash && hash.startsWith("#gid=")) {
			ret.sheetId = +hash.slice(5);
		}

		return ret;
	}

	static phrases = {
		get_no_sheet: "We could not find the sheet to get data from. Try providing the “sheet” option with the sheet title.",
		get_no_spreadsheet: url => `We could not find the spreadsheet with URL: ${url}. Check whether the spreadsheet URL is correct.`,
		store_no_sheet: sheet => `We could not find the “${sheet}” sheet in the spreadsheet. Try enabling the “allowAddingSheets” option to create it.`,
		store_sheet_added: sheet => `We could not find the “${sheet}” sheet in the spreadsheet and created it.`,
		get_no_sheet_or_invalid_range: (sheet, range, sheetIndex) => {
			let message;

			if (sheet) {
				message = `There is no sheet “${sheet}” in the spreadsheet`;

				if (range) {
					message += `, and/or “${range}” is not a valid cell range.`;
				}
				else {
					message += ".";
				}

				if (sheetIndex !== undefined) {
					message += ` We will try to get data from the sheet with index “${sheetIndex}”.`;
				}
			}
			else if (range) {
				message = `“${range}” is not a valid cell range.`;
			}

			return message;
		}
	};
}
