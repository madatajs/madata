import Coda from "../coda.js";
// https://coda.io/d/State-of-HTML-Planning_dTGBFYq175J/All-considered-features_suY7G#In-Part-1_tuBsZ/r1
const patterns = {
	api: /\/apis\/v1\/docs\/(?<docId>[\w-]+)\/tables\/(?<tableId>[\w-]+)\//,
	browserLink: /\/d\/[a-zA-Z\d-]*?_d(?<docId>[\w-]+)(\/[a-zA-Z\d-]*?(?<tentativePageId>_s[\w-]+))?/
};

export default class CodaTable extends Coda {
	async get (file = this.file) {
		if (!file.tableId) {
			// Resolve table id
			await this.resolveFile(file);
		}

		let rows = (await this.request(`docs/${file.docId}/tables/${file.tableId}/rows/?valueFormat=rich&useColumnNames=true`))?.items;

		// Transform rows to a more usable format
		return rows.map(row => {
			let ret = row.values;
			Object.defineProperty(ret, "__meta", {value: row, configurable: true, enumerable: false, writable: true});
			delete ret.__meta.values;

			// Drop weird backticks from plain text values
			for (let column in ret) {
				let value = fixPlainText(ret[column]);

				if (Array.isArray(value)) {
					value = value.map(fixPlainText);
				}

				ret[column] = value;
			}

			return ret;
		});
	}

	// // WIP. Does not work.
	// async put (data, {file = this.file} = {}) {
	// 	data = {
	// 		rows: data.map(item => {
	// 			return {
	// 				cells: Object.entries(item).map(([column, value]) => ({column, value}))
	// 			};
	// 		})
	// 	};

	// 	let serialized = await this.stringify(data);
	// 	return this.request(`docs/${file.docId}/tables/${file.tableId}/rows`, serialized, "POST");
	// }

	async resolveFile (file = this.file) {
		if (!file.docId) {
			throw new Error("Missing doc id");
		}

		let tables = await this.getDocTables(file);
		let table;

		if (file.pageId || file.tentativePageId) {
			for (let t of tables) {
				let page = t.parent;

				if (page.id === file.pageId || page.browserLink.endsWith(file.tentativePageId)) {
					table = t;
					break;
				}
			}
		}

		// If we still have no table either we have no page info, or the page info is wrong
		// Just return the first table in the doc
		table ??= tables[0];
		file.tableId = table.id;
		file.tableInfo = table;
	}

	async getDocTables (file = this.file) {
		let ret = await this.request(`docs/${file.docId}/tables/?tableTypes=table`);
		return ret?.items;
	}

	async getTableColumns (file = this.file) {
		let ret = await this.request(`docs/${file.docId}/tables/${file.tableId}/columns`);
		return ret?.items;
	}

	static parseURL (source) {
		let url = new URL(source, location);

		if (url.host === "coda.io") {
			for (let pattern in patterns) {
				let match = url.pathname.match(patterns[pattern]);

				if (match) {
					return Object.assign({}, match.groups);
				}
			}
		}

		return {};
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