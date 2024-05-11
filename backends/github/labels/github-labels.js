import GithubAPI from "../api/github-api.js";

export default class GithubLabels extends GithubAPI {
	static urlsKnown = [
		{hostname: "api.github.com", pathname: "repos/:owner/:repo/labels"},
		{hostname: "github.com", pathname: "/:owner/:repo/labels"},
	];

	static phrases = {
		not_authenticated: "Please log in to perform actions with labels on GitHub.",
		no_labels: "There are no labels to work with. Use the delete () method if you were to delete all existing labels in one go.",
		success: (action) => `Labels ${action}d:`,
		failure: (action) => `Labels failed to ${action}:`,
	};

	/**
	 * Performs operations (create, update, delete) with labels.
	 * @param {Array<any>} data Labels to create, update, or delete.
	 * @returns {Promise<Object>} Promise that is resolved with an object based on the results of performed operations.
	 */
	async put (data, {ref = this.ref, force = false} = {}) {
		if (!this.isAuthenticated()) {
			console.warn(this.constructor.phrase("not_authenticated"));
			return;
		}

		if (!data?.length && !force) {
			// We don't want to delete all existing labels accidentally
			console.warn(this.constructor.phrase("no_labels"));
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
			ret.created = await this.#write("create", toCreate, ref);
		}

		// Update existing labels
		// https://docs.github.com/en/rest/issues/labels?apiVersion=2022-11-28#update-a-label
		if (toUpdate.length) {
			ret.updated = await this.#write("update", toUpdate, ref);
		}

		// Delete existing labels
		// https://docs.github.com/en/rest/issues/labels?apiVersion=2022-11-28#delete-a-label
		if (toDelete.length) {
			ret.deleted = await this.#write("delete", toDelete, ref);
		}

		return ret;
	}

	/**
	 * Delete all existing labels in one go.
	 * @param {Object} ref
	 * @returns {Promise<Object>} Promise that is resolved with an object based on the results of label deletion.
	 */
	async delete (ref = this.ref) {
		return this.put([], {ref, force: true});
	}

	async #write (type, labels, ref) {
		let method;
		switch (type) {
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

			switch (type) {
				case "create":
					apiCall = ref.apiCall;
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
			let label = labels[index];

			if (promise.status === "fulfilled") {
				if (type === "delete") {
					// For deleted labels there is no additional information returned
					label = { name: label.name };
				}
				else {
					label = promise.value;
				}

				success.push(label);
			}
			else {
				failure.push({label, reason: promise.reason});
			}
		}

		if (success.length) {
			console.info(`${this.constructor.phrase("success", type)} ${success.map(l => l.name).join(", ")}.`);
		}

		if (failure.length) {
			console.warn(`${this.constructor.phrase("failure", type)} ${failure.map(l => l.name).join(", ")}.`);
		}

		return { success, failure };
	}
}
