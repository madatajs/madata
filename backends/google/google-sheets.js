import Google from "./google.js";

export default class GoogleSheets extends Google {
	update (url, o) {
		super.update(url, o);

		Object.assign(this, o);

		this.apiKey = this.apiKey ?? this.constructor.apiKey;
	}

	async get (url) {
		this.spreadsheetId = this.spreadsheetId ?? this.#getSpreadsheetId(url);

		try {
			if (this.#getRangeReference() === "") {
				this.sheet = await this.#findSheet();
			}
		}
		catch (e) {
			const error = (await e.json()).error.message;
			switch (e.status) {
				case 400:
					throw new Error(this.constructor.phrase("api_key_invalid"));
				case 401:
					await this.logout(); // Access token we have is invalid. Discard it.
					throw new Error(this.constructor.phrase("access_token_invalid"));
				case 403:
					throw new Error(this.constructor.phrase("no_read_permission", this.source));
				case 404:
					throw new Error(this.constructor.phrase("no_spreadsheet", this.source));
				default:
					throw new Error(this.constructor.phrase("unknown_error", error));
			}
		}

		const call = `${this.spreadsheetId}/?key=${this.apiKey}&ranges=${this.#getRangeReference()}&includeGridData=true`;

		let spreadsheet;
		try {
			spreadsheet = await this.request(call);
		}
		catch (e) {
			const error = (await e.json()).error.message;
			switch (e.status) {
				case 400:
					throw new Error(this.constructor.phrase("no_sheet_or_invalid_range", this.source, error));
				case 401:
					await this.logout(); // Access token we have is invalid. Discard it.
					throw new Error(this.constructor.phrase("access_token_invalid"));
				case 403:
					throw new Error(this.constructor.phrase("no_read_permission", this.source));
				case 404:
					throw new Error(this.constructor.phrase("no_spreadsheet", this.source));
				default:
					throw new Error(this.constructor.phrase("unknown_error", error));
			}
		}

		let rawData = spreadsheet.sheets[0].data[0].rowData?.map(r => r.values);
		if (!rawData) {
			// No data to work with. It might be the spreadsheet is empty.
			// No need to proceed.
			this.loadedData = [];

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
			this.loadedData = [];

			return [];
		}

		// Save data offset inside raw values to be able to store data back in the same range as the source data.
		this.rowOffset = startRow;
		this.columnOffset = startColumn;

		// Search for the end of the first range of data.
		let endRow,
		endColumn = Math.max(...rawData.map(row => row.length - 1));

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

				if (this.formattedValues) {
					value = cell.formattedValue;
				}
				else {
					value = cell.effectiveValue["stringValue"] ?? cell.effectiveValue["numberValue"] ?? cell.effectiveValue["boolValue"];

					// Do we have date/time/date and time?
					if (this.convertDateTime && cell.effectiveFormat.numberFormat) {
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
				}

				ret.push(value);
			}

			data.push(ret);
		}

		// We need to store the loaded data so that we can perform diff later.
		// Why? Because Google Sheets has a built-in version history and we want to benefit from it.
		// And if every time we overwrite the full data range, it makes the version history useless.
		this.loadedData = [...data];

		return data;
	}

	/**
	 * Write data to a spreadsheet
	 * @param {*} data — Data to store
	 * @param {string} spreadsheet — Spreadsheet URL
	 * @param {string} sheet — Sheet name
	 * @param {string} range — Range
	 */
	async store (data, {spreadsheet = this.source, sheet = this.sheet, range = this.range, ...o} = {}) {
		const spreadsheetId = this.#getSpreadsheetId(spreadsheet) ?? this.spreadsheetId;

		if (this.#getRangeReference(sheet, range) === "") {
			try {
				sheet = await this.#findSheet(spreadsheetId);
			}
			catch (e) {
				const error = (await e.json()).error.message;
				switch (e.status) {
					case 401:
						await this.logout(); // Access token we have is invalid. Discard it.
						throw new Error(this.constructor.phrase("access_token_invalid"));
					case 403:
						throw new Error(this.constructor.phrase("no_write_permission", spreadsheet));
					case 404:
						throw new Error(this.constructor.phrase("no_spreadsheet", spreadsheet));
					default:
						throw new Error(this.constructor.phrase("unknown_error", error));
				}
			}
		}

		if (this.loadedData) {
			const recordCount = data.length;

			// If we write back fewer records than we previously got, we need to remove the old data.
			// The way we can do it is to provide records filled with empty strings.
			if (recordCount < this.loadedData.length) {
				const record = Array(data[0].length).fill(""); // ["", ..., ""] — empty row/column of data
				const records = Array(this.loadedData.length - recordCount).fill(record); // [ ["", ..., ""], ["", ..., ""], ..., ["", ..., ""] ]

				data = data.concat(records);
			}
		}

		// Add “empty” rows and columns to data so we could store them in the same range we got the source data from.
		const emptyRecord = this.columnOffset > 0 ? Array(this.columnOffset + data[0].length).fill(undefined) : []; // [undefined, ..., undefined]
		const emptyRecords = this.rowOffset > 0 ? Array(this.rowOffset).fill(emptyRecord) : []; // [ [undefined, ..., undefined], [undefined, ..., undefined], ..., [undefined, ..., undefined] ]

		if (this.columnOffset > 0) {
			// Prepend every row with “empty” columns.
			data = data.map(row => [...Array(this.columnOffset).fill(undefined), ...row]); // [undefined, ..., undefined, data, data, ..., data]
		}

		// Prepend data with “empty” rows.
		data = [...emptyRecords, ...data]; // [ [undefined, ..., undefined, undefined, undefined, ..., undefined], ..., [undefined, ..., undefined, undefined, undefined, ..., undefined], [undefined, ..., undefined, data, data, ..., data], ..., [undefined, ..., undefined, data, data, ..., data] ]

		// Write the new data.
		const call = `${spreadsheetId}/values/${this.#getRangeReference(sheet, range)}?key=${this.apiKey}&valueInputOption=user_entered&responseValueRenderOption=${this.formattedValues ? "formatted_value" : "unformatted_value"}&includeValuesInResponse=true`;
		const body = {
			"range": this.#getRangeReference(sheet, range),
			"majorDimension": "rows",
			"values": data
		};

		let response;
		try {
			response = await this.request(call, body, "PUT");
		}
		catch (e) {
			switch (e.status) {
				case 401:
					await this.logout(); // Access token we have is invalid. Discard it.
					throw new Error(this.constructor.phrase("access_token_invalid"));
				case 403:
					throw new Error(this.constructor.phrase("no_write_permission", spreadsheet));
				case 404:
					throw new Error(this.constructor.phrase("no_spreadsheet", spreadsheet));
			}

			if (e.status === 400) {
				if (sheet) {
					// It might be there is no sheet with the specified name.
					// Let's check it.
					const spreadsheetData = await this.request(spreadsheetId);
					const sheetData = spreadsheetData.sheets?.find?.(sheet => sheet.properties?.title === sheet);

					if (!sheetData) {
						// There is no. Let's try to create one.
						const req = {
							requests: [
								{
									addSheet: {
										properties: {
											title: sheet
										}
									}
								}
							]
						};

						try {
							await this.request(`${spreadsheetId}:batchUpdate`, req, "POST");

							// Warn about the newly created sheet.
							console.warn(this.constructor.phrase("no_sheet_to_store_data", spreadsheet, sheet));

							// Let's try to write data one more time.
							response = await this.request(call, body, "PUT");
						}
						catch (e) {
							const error = (await e.json()).error.message;

							if (error.startsWith("Unable to parse range")) {
								throw new Error(this.constructor.phrase("invalid_range", e));
							}
							else if (error.startsWith("Requested writing within range")) {
								throw new Error(this.constructor.phrase("small_range", range));
							}
							else if (error.includes("protected cell or object")) {
								// The sheet and/or range is protected
								throw new Error(e);
							}
							else if (error.startsWith("Invalid values")) {
								throw new Error(this.constructor.phrase("invalid_data_structure", spreadsheet, data));
							}

							throw new Error(this.constructor.phrase("unknown_error", error));
						}
					}
				}
			}
			else {
				const error = (await e.json()).error.message;
				throw new Error(this.constructor.phrase("unknown_error", error));
			}
		}

		// Saved successfully
		this.loadedData = response.updatedData?.values;

		return response;
	}

	async login (...args) {
		const user = await super.login(...args);

		if (user) {
			this.updatePermissions({edit: true, save: true});
		}

		return user;
	}

	#getSpreadsheetId (url = this.file.url) {
		url = new URL(url);

		// Why? One can pass the spreadsheet URL as an option of the store() method.
		// It allows reading data from one spreadsheet and storing it in another one.
		// Should we allow it? Or am I overengineering the problem?
		if (url.host !== "docs.google.com" || !url.pathname.startsWith("/spreadsheets/")) {
			return null;
		}

		return url.pathname?.slice(1)?.split("/")?.[2];
	}

	#getRangeReference (sheet = this.sheet, range = this.range) {
		/**
		 * Since sheet title and cells range are optional, we need to cover all the possible cases:
		 *
		 * - 'Sheet title'!Range
		 * – 'Sheet title'
		 * – Range
		 */
		return `${sheet ? `'${sheet}'` : ""}${range ? (sheet ? `!${range}` : range) : ""}`
	}

	/**
	 * If neither sheet title nor range is provided, we should use some default range to get/read data from/to.
	 * Otherwise, a request to a spreadsheet will fail, and we don't want it.
	 * Let's use all cells of the first visible sheet by default. To do that, we need to provide its title.
	 */
	async #findSheet (spreadsheetId = this.spreadsheetId, key = this.apiKey) {
		const call = `${spreadsheetId}/?key=${key}`;
		const spreadsheet = await this.request(call);
		const visibleSheet = spreadsheet.sheets?.find?.(sheet => !sheet.properties?.hidden);

		return visibleSheet?.properties?.title;
	}

	// FIXME: I have a HUGE doubt whether it's a hack or not!
	static getOAuthProvider () {
		return { name: "Google Sheets" };
	}

	static apiDomain = "https://sheets.googleapis.com/v4/spreadsheets/";
	static scopes = ["https://www.googleapis.com/auth/spreadsheets"];

	static test (url) {
		return url.startsWith("https://docs.google.com/spreadsheets/");
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
		access_token_invalid: "Access token is invalid. Please, log in again.",
		api_key_invalid: key => `The API key “${key}” is not valid. Please provide a valid API key.`,
		no_read_permission: spreadsheet => `You don not have permission to read data from the spreadsheet “${spreadsheet}”.`,
		no_write_permission: spreadsheet => `You don not have permission to write data to the spreadsheet “${spreadsheet}”.`,
		no_spreadsheet: spreadsheet => `We could not find the spreadsheet “${spreadsheet}”.`,
		no_sheet_to_store_data: (spreadsheet, sheet) => `We could not find the ”${sheet}“ sheet in the spreadsheet “${spreadsheet}” and created it.`,
		no_sheet_or_invalid_range: (spreadsheet, error) => `There is no sheet with the specified name in the spreadsheet “${spreadsheet}”, and/or the format you used to specify the range is invalid. ${error}.`,
		invalid_range: error => `The format you used to specify the range for storing data is invalid. ${error}.`,
		small_range: range => `The “${range}” range is not large enough to store all your data.`,
		invalid_data_structure: (spreadsheet, data) => `The data you are trying to write to the spreadsheet “${spreadsheet}” has an invalid structure: ${data}.`,
		unknown_error: error => `An unknown error occurred. ${error}.`
	};
}