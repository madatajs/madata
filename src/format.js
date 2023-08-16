export default class Format {
	static defaultOptions = {};
	static extensions = [];
	static mimeTypes = [];

	constructor (options = {}) {
		this.options = this.constructor.resolveOptions(options);
	}

	parse (str) {
		return this.constructor.parse(str, this.options);
	}

	stringify (obj) {
		return this.constructor.stringify(obj, this.options);
	}

	static parse (str) {
		prepare("parse", this);

		return this.defaultInstance.parse(str);
	}

	static stringify (obj) {
		prepare("stringify", this);

		return this.defaultInstance.stringify(obj);
	}

	static resolveOptions (options) {
		return Object.assign({}, this.defaultOptions, options);
	}

	static all = [];

	static register (Class) {
		Format[Class.name] = Class;
		Format.all.push(Class);
		return Class;
	}

	static toBlob (str, options) {
		if (options.stringify || (typeof str !== "string" && !(str instanceof String))) {
			str = this.stringify(str, options);
		}

		return new Blob([str], {type: this.mimeTypes[0]});
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