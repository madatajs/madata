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
		{hostname: "github.com", pathname: "/:owner/:repo/issues/labels"},
		{hostname: "github.com", pathname: "/:owner/:repo/milestones"},
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
	async put (data, {ref = this.ref, allow = "create update delete"} = {}) {
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

		// Allowed operations
		allow = new Set(allow.trim().split(/\s+/));

		// Label properties to monitor—label should be updated if any of these have changed
		const props = ["name", "color", "default", "description"];

		// Operations to be performed
		let to = {};
		to.create = !allow.has("create") ? [] : data.filter(label => !label.id || !this.data.find(l => l.id === label.id));
		to.update = !allow.has("update") ? [] : data.filter(label => this.data.find(l => l.id === label.id && props.some(prop => l[prop] !== label[prop])));
		to.delete = !allow.has("delete") ? [] : this.data.filter(l => !data.find(label => label.id === l.id));

		// Results of performed operations
		let ret = {};
		for (let action in to) {
			if (to[action].length) {
				ret[`${action}d`] = await this.#write(action, to[action], ref);
			}
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
			console.warn(`${this.constructor.phrase("failure", type)} ${failure.map(({label}) => label.name).join(", ")}.`);
		}

		return { success, failure };
	}
}
