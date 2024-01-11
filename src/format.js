export default class Format {
	static defaultOptions = {};
	static extensions = [];
	static mimeTypes = [];

	constructor (options = {}) {
		this.options = options;
	}

	parse (str) {
		let options = this.constructor.resolveOptions(this.options, "parse");
		return this.constructor.parse(str, options);
	}

	stringify (obj) {
		let options = this.constructor.resolveOptions(this.options, "stringify");
		return this.constructor.stringify(obj, options);
	}

	static parse (str) {
		prepare("parse", this);

		return this.defaultInstance.parse(str);
	}

	static stringify (obj) {
		prepare("stringify", this);

		return this.defaultInstance.stringify(obj);
	}

	static resolveOptions (options, action) {
		let ret = Object.assign({}, this.defaultOptions);

		if (action && this.defaultOptions[action]) {
			Object.assign(ret, this.defaultOptions[action]);
		}

		if (options) {
			Object.assign(options, options[action]);
		}

		delete ret.parse;
		delete ret.stringify;

		return ret;
	}

	static all = [];

	static register (Class) {
		Format[Class.name] = Class;
		Format.all.push(Class);
		return Class;
	}

	/**
	 * Find a registered Format by its name, MIME type, or extension
	 * @param {string | object} criteria If string, searches by name, MIME type, or extension, prioritizing name matches.
	 * If object, searches by the specific criteria provided.
	 * @param {string} [criteria.mimeType]
	 * @param {string} [criteria.extension]
	 * @param {object} [o] Options
	 * @param {boolean} [o.require] If true, throws an error if no format is found
	 * @returns
	 */
	static find (criteria, o) {
		if (typeof criteria === "string") {
			// Find format by either id, extension, or MIME type, prioritizing id
			// Case insensitive, though name lookup is O(1) if you use the correct case
			if (this[criteria]) {
				return this[criteria];
			}

			return this.all.find(format => format.name.toLowerCase() === criteria.toLowerCase())
				?? this.find({ extension: criteria })
				?? this.find({ mimeType: criteria }) ?? null;
		}

		let { mimeType, extension } = criteria;

		let ret = this.all.find(format => (
			   (mimeType && format.mimeTypes.includes(mimeType))
			|| (extension && format.extensions.includes(extension))
		));

		if (ret) {
			return ret;
		}

		if (o?.require) {
			throw new Error(`No format found that matches ${JSON.stringify(criteria)}`);
		}

		return null;
	}

	static toBlob (str, options) {
		if (options?.stringify || (typeof str !== "string" && !(str instanceof String))) {
			str = this.stringify(str, options);
		}

		return new Blob([str], {type: this.mimeTypes[0]});
	}

	static toBlobURL (str, options) {
		return URL.createObjectURL(this.toBlob(str, options));
	}
}

function prepare (name, self) {
	// Do we have at least one implemented method?
	if (self.prototype[name] === Format.prototype[name] && self[name] === Format[name]) {
		throw new Error(`Format ${self.name} needs to implement either an instance ${name}(arg) method, or a static ${name}(arg, options) method.`);
	}

	if (!self.defaultInstance) {
		self.defaultInstance = new self();
	}
}