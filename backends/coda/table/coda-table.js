import Coda from "../coda.js";

/**
 * @category Coda
 */
export default class CodaTable extends Coda {
	async get (ref = this.ref) {
		if (!ref.tableId) {
			// Resolve table id
			await this.resolveRef(ref);
		}

		let rows = await this.getTableRows(ref);

		// Transform rows to a more usable format
		return rows.map(row => {
			let ret = row.values;
			Object.defineProperty(ret, "__meta", {value: row, configurable: true, enumerable: false, writable: true});
			delete ret.__meta.values;

			// Drop weird backticks from plain text values
			transformRowColumns(ret, fixPlainText);

			return ret;
		});
	}

	// // WIP. Does not work.
	// async put (data, {ref = this.ref} = {}) {
	// 	data = {
	// 		rows: data.map(item => {
	// 			return {
	// 				cells: Object.entries(item).map(([column, value]) => ({column, value}))
	// 			};
	// 		})
	// 	};

	// 	let serialized = await this.stringify(data);
	// 	return this.request(`docs/${ref.docId}/tables/${ref.tableId}/rows`, serialized, "POST");
	// }

	async resolveRef (ref = this.ref) {
		if (!ref.docId) {
			throw new Error("Missing doc id");
		}

		let tables = await this.getDocTables(ref);
		let table;

		if (ref.pageId || ref.tentativePageId) {
			for (let t of tables) {
				let page = t.parent;

				if (page.id === ref.pageId || page.browserLink.endsWith(ref.tentativePageId)) {
					table = t;
					break;
				}
			}
		}

		// If we still have no table either we have no page info, or the page info is wrong
		// Just return the first table in the doc
		table ??= tables[0];
		ref.tableId = table.id;
		ref.tableInfo = table;
	}

	async getDocTables (ref = this.ref) {
		let ret = await this.request(`docs/${ref.docId}/tables/?tableTypes=table`);
		return ret?.items;
	}

	async getTableColumns (ref = this.ref) {
		let ret = await this.request(`docs/${ref.docId}/tables/${ref.tableId}/columns`);
		return ret?.items;
	}

	async getTableRows (ref = this.ref) {
		let items = [];
		let options = {valueFormat: "rich", useColumnNames: true, sortBy: "natural"};
		let optionsString = Object.entries(options).map(([key, value]) => `${key}=${value}`).join("&");
		let data;
		let url = `docs/${ref.docId}/tables/${ref.tableId}/rows/?${optionsString}`;

		do {
			data = await this.request(url + (data?.nextPageToken ? `&pageToken=${data.nextPageToken}` : ""));
			if (data) {
				items.push(...data.items);
				options.pageToken = data.nextPageToken;
			}
		} while (data?.nextPageToken);

		return items;
	}

	static path = "/d/";

	// Example URL: https://coda.io/d/State-of-HTML-Planning_dTGBFYq175J/All-considered-features_suY7G#In-Part-1_tuBsZ/r1
	static patterns = {
		api: /\/apis\/v1\/docs\/(?<docId>[\w-]+)\/tables\/(?<tableId>[\w-]+)\//,
		browserLink: /\/d\/[a-zA-Z\d-]*?_d(?<docId>[\w-]+)(\/[a-zA-Z\d-]*?(?<tentativePageId>_s[\w-]+))?/
	};

	/**
	 * Convert JSON-LD structured objects to plain strings whenever possible
	 * Can we do this by default? or will we not be able to write back?
	 * @param {Array<object>} rows
	 */
	static simplifyData (rows) {
		return rows.map(row => {
			row = Object.assign({}, row);

			transformRowColumns(row, value => {
				if (!value || typeof value !== "object" || !("@type" in value)) {
					return value;
				}

				switch (value["@type"]) {
					case "StructuredValue":
						return value.name;
					case "WebPage":
						return value.url;
					case "ImageObject":
						return value.url;
				}
			});

			return row;
		});
	}
}

function fixPlainText (value) {
	if (typeof value === "string" && /^```(?!\n)[\S\s]*```$/.test(value)) {
		value = value.slice(3, -3);

		if (value) {
			value = new String(value);
			value.plainText = true;
		}
	}

	return value;
}

function transformRowColumns (columns, fn) {
	for (let column in columns) {
		let value = columns[column];

		if (Array.isArray(value)) {
			value = value.map(fn);
		}
		else {
			value = fn(value);
		}

		columns[column] = value;
	}
}
