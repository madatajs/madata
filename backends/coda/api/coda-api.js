import Coda from "../coda.js";

/**
 * @category Coda
 */
export default class CodaAPI extends Coda {
	async get (ref = this.ref) {
		return this.request(ref.url);
	}

	static urls = [
		"https://coda.io/apis/v1/*"
	]
}