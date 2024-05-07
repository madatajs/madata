import GithubAPI from "../api/github-api.js";

export default class GithubLabels extends GithubAPI {
	static urls = [
		{hostname: "api.github.com", pathname: "repos/:owner/:repo/labels"},
		{hostname: "github.com", pathname: "/:owner/:repo/labels"},
	];

	async put (data, {ref = this.ref} = {}) {
		// this.data is existing labels
		// fetch if not already fetched

		// data is new labels
		// compare and run suitable API calls:
		// - create new labels: https://docs.github.com/en/rest/issues/labels?apiVersion=2022-11-28#create-a-label
		// - update existing labels: https://docs.github.com/en/rest/issues/labels?apiVersion=2022-11-28#update-a-label
		// - delete labels: https://docs.github.com/en/rest/issues/labels?apiVersion=2022-11-28#delete-a-label
		// or perhaps https://docs.github.com/en/graphql/reference/mutations#createlabel ?

	}
}