import GithubAPI from "../api/github-api.js";

/**
 * Backend for performing operations with labels on GitHub repositories.
 * @category GitHub
 */
export default class GithubLabels extends GithubAPI {
	static urls = [
		{hostname: "api.github.com", pathname: "repos/:owner/:repo/labels"},
		{hostname: "api.github.com", pathname: "/repos/:owner/:repo/labels"},
		{hostname: "api.github.com", pathname: "/repos/:owner/:repo/issues/:issue_number/labels"},
		{hostname: "api.github.com", pathname: "/repos/:owner/:repo/milestones/:milestone_number/labels"},
		{hostname: "github.com", pathname: "/:owner/:repo/labels"},
	];

	static phrases = {
		no_labels: "There are no labels to work with. Pass an empty array if you were to delete all existing labels in one go.",
		failure: (action) => `Labels failed to ${action}:`,
	};

	/**
	 * Performs operations (create, update, delete) with labels.
	 * @param {Array<any>} data Labels to create, update, or delete.
	 * @returns {Promise<Object | null>} Promise that is resolved with an object based on the results of performed operations.
	 */
	async put (data, {ref = this.ref, skipDeletion = false} = {}) {
		if (!data) {
			// Nothing to work with
			console.warn(this.constructor.phrase("no_labels"));
			return null;
		}

		if (!this.data) {
			// Existing labels are not yet fetched. Fetching...
			try {
				await this.load(this.source);
			}
			catch (err) {
				if (err.status === 404) {
					return null;
				}
			}
		}

		let ret = {};
		let toCreate = data.filter(label => !label.id || !this.data.find(l => l.id === label.id));
		let toDelete = skipDeletion ? [] : this.data.filter(l => !data.find(label => label.id === l.id));

		// Label should be updated if any of its properties (name, color, etc.) have changed
		let props = ["name", "color", "default", "description"];
		let toUpdate = data.filter(label => this.data.find(l => l.id === label.id && props.some(prop => l[prop] !== label[prop])));

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

	async #write (type, labels, ref) {
		const methods = {update: "PATCH", delete: "DELETE"};
		let method = methods[type] ?? "POST";

		let result = await Promise.allSettled(labels.map(label => {
			let apiCall = label.url, data = label, req;

			if (type === "create") {
				apiCall = ref.endpoint;
			}
			else if (type === "delete") {
				data = null;
				req = {responseType: "text"};
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

		if (failure.length) {
			console.warn(`${this.constructor.phrase("failure", type)} ${failure.map(l => l.name).join(", ")}.`);
		}

		return { success, failure };
	}

	static parseURL (source) {
		let ret = super.parseURL(source);

		ret.endpoint = ret.url.pathname.slice(1);
		ret.apiCall = ret.endpoint + ret.url.search; // used by the GithubAPI backend to get data

		return ret;
	}
}
