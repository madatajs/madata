import Google from "./google.js";

export default class GoogleSheets extends Google {
	/**
	 * Read data from the spreadsheet.
	 * @param {string} url Spreadsheet URL.
	 * @returns Spreadsheet data.
	 */
	async get (url) {
		const file = url? this.constructor.parseURL(url) : this.file;

		if (file.sheetId !== undefined && !file.sheetTitle || this.#getRangeReference(file) === "") {
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

		const rangeReference = this.#getRangeReference(file);
		const call = `${file.id}/?key=${this.apiKey}&ranges=${rangeReference}&includeGridData=true`;

		let spreadsheet;
		try {
			spreadsheet = await this.request(call);
		}
		catch (e) {
			if (e.status === 401) {
				await this.logout(); // Access token we have is invalid. Discard it.
			}

			const error = (await e.json()).error.message;
			throw new Error(error);
		}

		let rawData = spreadsheet.sheets[0].data[0].rowData?.map(r => r.values);
		if (!rawData) {
			// No data to work with. It might be the spreadsheet is empty.
			// No need to proceed.
			return [];
		}

		// Search for the beginning of data.
		let startRow = 0, startColumn;
		for (const row of rawData) {
			startColumn = row?.findIndex(cell => cell?.effectiveValue);

			if (startColumn !== undefined && startColumn !== -1) {
				break;
			}

			startRow += 1;
		}

		if (startRow >= rawData.length || startColumn === undefined || startColumn === -1) {
			// No data to work with
			return [];
		}

		// Search for the end of the first range of data.
		let endRow,
		endColumn = Math.max(...rawData.map(row => row? row.length - 1 : 0));

		// Search for the first fully empty row.
		for (let row = startRow; row < rawData.length; row++) {
			const r = rawData[row];

			let isEmpty = true;
			for (let column = startColumn; column <= endColumn; column++) {
				if (r?.[column]?.effectiveValue) {
					isEmpty = false;
					break;
				}
			}

			if (!r || isEmpty) {
				endRow = row - 1;
				break;
			}
		}
		endRow = endRow ?? rawData.length - 1;

		// Search for the first fully empty column to adjust endColumn.
		let column = startColumn + 1;
		let isEmpty;
		while (true) {
			isEmpty = true;
			for (let row = startRow; row <= endRow; row++) {
				if (rawData[row]?.[column]?.effectiveValue) {
					column += 1;
					isEmpty = false;
					break;
				}
			}

			if (isEmpty) {
				endColumn = column - 1;
				break;
			}
		}

		let data = [];
		for (let rowIndex = startRow; rowIndex <= endRow; rowIndex++) {
			const row = rawData[rowIndex];
			const ret = [];

			for (let columnIndex = startColumn; columnIndex <= endColumn; columnIndex++) {
				const cell = row[columnIndex];
				let value;

				if (!cell?.effectiveValue) {
					// We have an empty cell
					ret.push(undefined);
					continue;
				}

				value = cell.effectiveValue["stringValue"] ?? cell.effectiveValue["numberValue"] ?? cell.effectiveValue["boolValue"];

				// Do we have date/time/date and time?
				if (this.options.convertDateTime && cell.effectiveFormat.numberFormat) {
					const type = cell.effectiveFormat.numberFormat.type;

					if (["DATE", "TIME", "DATE_TIME"].includes(type)) {
						const { date, time } = GoogleSheets.#toISO(value);

						switch (type) {
							case "DATE":
								value = date;
								break;

							case "TIME":
								value = time;
								break;

							case "DATE_TIME":
								value = `${date}T${time}`;
								break;
						}
					}
				}

				ret.push(value);
			}

			data.push(ret);
		}

		return data;
	}

	/**
	 * Save data to the spreadsheet.
	 * @param {*} data Data to save.
	 * @param {Object} file Spreadsheet to work with.
	 * @param {Object} options Options: sheetTitle, range.
	 */
	async store (data, {file = this.file, ...options} = {}) { // Why not put()? To avoid data serialization.
		file = Object.assign({}, file, {...options});

		const rangeReference = this.#getRangeReference(file);
		const call = `${file.id}/values/${rangeReference}?key=${this.apiKey}&valueInputOption=user_entered&responseValueRenderOption=unformatted_value&includeValuesInResponse=true`;
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
					let spreadsheet = this.spreadsheet;
					if (!spreadsheet) {
						spreadsheet = await this.request(file.id);
						this.spreadsheet = spreadsheet;
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

	/**
	 * Get the range reference.
	 * @param {string} sheetTitle Sheet title.
	 * @param {string} range Range in the A1 notation.
	 * @returns The range reference in one of the supported formats: 'Sheet title'!Range, 'Sheet title', or Range.
	 */
	#getRangeReference ({sheetTitle = this.file.sheetTitle, range = this.file.range} = file) {
		return `${sheetTitle ? `'${sheetTitle}'` : ""}${range ? (sheetTitle ? `!${range}` : range) : ""}`
	}

	/**
	 * Get title of the sheet in the spreadsheet.
	 * @param {Object} file Spreadsheet to work with.
	 * @returns Sheet title or title of the first visible sheet, or null if there are no (visible) sheets to work with.
	 */
	async #getSheetTitle (file = this.file) {
		const call = `${file.id}/?key=${this.apiKey}`;

		const spreadsheet = await this.request(call);
		// Store the spreadsheet for future use (to avoid extra network requests).
		if (!this.spreadsheet) {
			this.spreadsheet = spreadsheet;
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
	static scopes = ["https://www.googleapis.com/auth/spreadsheets"];

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
			sheetId: undefined,
			sheetTitle: undefined,
			range: undefined
		};
		const url = new URL(source);
		const path = url.pathname.slice(1).split("/");
		const hash = url.hash;

		ret.id = path[2];
		if (hash && hash.startsWith("#gid=")) {
			ret.sheetId = +hash.slice(5);
		}

		return ret;
	}

	static #toISO (serial) {
		// Convert date/time from serial number (Google Sheets format) to ISO format.
		// TODO: Exclude (or add as util?) Mavo constants and functions: localTimezone, minutes(), days(), date(), time()
		const UNIX_EPOCH_OFFSET = 25569;
		const timezoneOffset = $f.localTimezone * $f.minutes();
		const date = $f.date((serial - UNIX_EPOCH_OFFSET) * $f.days());
		const time = $f.time((serial - Math.trunc(serial)) * $f.days() - timezoneOffset, "seconds");

		return { date, time };
	}

	static phrases = {
		get_no_sheet: "We could not find the sheet to get data from. Try providing the sheetTitle option with the sheet title.",
		store_no_sheet: sheet => `We could not find the ${sheet} sheet in the spreadsheet. Try enabling the allowAddingSheets option to create it.`,
		store_sheet_added: sheet => `We could not find the ${sheet} sheet in the spreadsheet and created it.`
	}
}