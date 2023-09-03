import Coda from "../coda.js";

export default class CodaAPI extends Coda {
	async get (file = this.file) {
		return this.request(file.url);
	}

	static test (url) {
		return url.startsWith(this.apiDomain);
	}
}