import GithubAPI from "../api/github-api.js";

export default class GithubLabels extends GithubAPI {
	static urlsKnown = [
		{hostname: "api.github.com", pathname: "repos/:owner/:repo/labels"},
		{hostname: "github.com", pathname: "/:owner/:repo/labels"},
	];

	static phrases = {
		not_authenticated: "Please log in to perform actions with labels on GitHub.",
		success: (action) => `Labels ${action}d:`,
		failure: (action) => `Labels failed to ${action}:`,
		none: "none",
	};

	/**
	 * Performs operations (create, update, delete) with labels.
	 * @param {Array<any>} data Labels to create, update, or delete.
	 * @returns {Array<any>} Array of results of performed operations.
	 */
	async put (data, {ref = this.ref} = {}) {
		if (!this.isAuthenticated()) {
			console.warn(this.constructor.phrase("not_authenticated"));
			return;
		}

		if (!this.data) {
			// Existing labels are not yet fetched. Fetching...
			await this.load(this.source);
		}

		let ret = {};
		let toCreate = data.filter(label => !this.data.find(l => l.name === label.name));
		let toDelete = this.data.filter(l => !data.find(label => label.name === l.name));

		// Label should be updated if it has a new name (in that case the new_name property is mandatory)
		// or if any of its properties (color, default, description) have changed
		let toUpdate = data.filter(label => label.new_name || this.data.find(l => l.name === label.name && ["color", "default", "description"].some(prop => l[prop] !== label[prop])));

		// Create new labels
		// https://docs.github.com/en/rest/issues/labels?apiVersion=2022-11-28#create-a-label
		if (toCreate.length) {
			ret.created = await this.#labels("create", toCreate, ref);
		}

		// Update existing labels
		// https://docs.github.com/en/rest/issues/labels?apiVersion=2022-11-28#update-a-label
		if (toUpdate.length) {
			ret.updated = await this.#labels("update", toUpdate, ref);
		}

		// Delete existing labels
		// https://docs.github.com/en/rest/issues/labels?apiVersion=2022-11-28#delete-a-label
		if (toDelete.length) {
			ret.deleted = await this.#labels("delete", toDelete, ref);
		}

		return ret;
	}

	async #labels (action, labels, ref) {
		let method;
		switch (action) {
			case "update":
				method = "PATCH";
				break;

			case "delete":
				method = "DELETE";
				break;

			default:
				method = "POST";
		}

		let result = await Promise.allSettled(labels.map(label => {
			let apiCall = label.url, data = label, req;

			switch (action) {
				case "create":
					apiCall = `${ref.apiCall}`;
					break;

				case "update":
					if (label.new_name) {
						data = {...label, name: label.new_name};
					}
					break;

				case "delete":
					data = null;
					req = {responseType: "text"};
					break;
			}

			return this.request(apiCall, data, method, req);
		}));

		let success = [], failure = [];
		for (let [index, promise] of result.entries()) {
			let name = labels[index].name;
			if (action === "update" && labels[index].new_name) {
				name += ` (${labels[index].new_name})`;
			}

			if (promise.status === "fulfilled") {
				success.push(name);
			}
			else {
				failure.push({name, reason: promise.reason});
			}
		}

		console.info(`${this.constructor.phrase("success", action)} ${success.length ? success.join(", ") : this.constructor.phrase("none")}.`);

		if (failure.length) {
			console.warn(`${this.constructor.phrase("failure", action)} ${failure.map(l => l.name).join(", ")}.`);
		}

		return { success, failure };
	}
}
