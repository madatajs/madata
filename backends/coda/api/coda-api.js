import Coda from "../coda.js";

/**
 * @class CodaAPI
 * @extends Coda
 * @category Coda
 */
export default class CodaAPI extends Coda {
	async get (ref = this.ref) {
		return this.request(ref.url);
	}

	static path = "/apis/v1/";
}