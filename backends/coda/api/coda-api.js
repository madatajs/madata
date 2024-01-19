import Coda from "../coda.js";

/**
 * @class CodaAPI
 * @extends Coda
 */
export default class CodaAPI extends Coda {
	async get (file = this.file) {
		return this.request(file.url);
	}

	static path = "/apis/v1/";
}