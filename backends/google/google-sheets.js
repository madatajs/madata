import Google from "./google.js";

export default class GoogleSheets extends Google {
	update (url, o) {
		super.update(url, o);

		Object.assign(this, o);

		this.spreadsheet = this.file.url.pathname?.slice(1)?.split("/")?.[2];
		this.apiKey = this.apiKey ?? this.constructor.apiKey;
	}

	async get () {
		try {
			if (this.#getRangeReference() === "") {
				this.sheet = await this.#findSheet();
			}
		}
		catch (e) {
			switch (e.status) {
				case 400:
					throw new Error(this.constructor.phrase("api_key_invalid"));
				case 401:
					this.logout(); // Access token we have is invalid. Discard it.
					throw new Error(this.constructor.phrase("access_token_invalid"));
				case 403:
					throw new Error(this.constructor.phrase("no_read_permission"));
				case 404:
					throw new Error(this.constructor.phrase("no_spreadsheet"));
				default:
					throw new Error(this.constructor.phrase("unknown_error", e));
			}
		}

		const call = `${this.spreadsheet}/?key=${this.apiKey}&ranges=${this.#getRangeReference()}&includeGridData=true`;

		let spreadsheet;
		try {
			spreadsheet = await this.request(call);
		}
		catch (e) {
			switch (e.status) {
				case 400:
					const error = (await e.json()).error.message;
					throw new Error(this.constructor.phrase("no_sheet_or_invalid_range", error));
				case 403:
					throw new Error(this.constructor.phrase("no_read_permission"));
				case 404:
					throw new Error(this.constructor.phrase("no_spreadsheet"));
				default:
					throw new Error(this.constructor.phrase("unknown_error", e));
			}
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
		this.loadedData = data;

		return data;
	}

	async login (...args) {
		const user = await super.login(...args);

		if (user) {
			this.updatePermissions({edit: true, save: true});
		}

		return user;
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
	async #findSheet () {
		const call = `${this.spreadsheet}/?key=${this.apiKey}`;
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
		no_read_permission: "You don not have permission to read data from the spreadsheet.",
		no_spreadsheet: "We could not find the spreadsheet you specified.",
		no_sheet_to_store_data: sheet => `We could not find the ”${sheet}“ sheet in the spreadsheet and created it.`,
		no_sheet_or_invalid_range: error => `There is no sheet with the specified name in the spreadsheet, and/or the format you used to specify the data range is invalid. ${error}.`,
		unknown_error: error => `An unknown error occurred. ${error}.`
	};
}