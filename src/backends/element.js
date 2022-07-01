import Backend from "../backend.js";

/**
 * Save in an HTML element
 */
export default class Element extends Backend {
	id = "Element"

	constructor (url, o) {
		super(url, o);

		this.updatePermissions({
			read: true,
			edit: true,
			save: true
		});
	}

	update (url, o) {
		super.update(url, o);

		this.observer?.disconnect();

		this.element = $(this.source) ?? $.create("script", {
			type: "application/json",
			id: this.source.slice(1),
			inside: document.body
		});

		this.observer = this.observer ?? new MutationObserver(records => {
			this.dispatchEvent(new CustomEvent("mv-remotedatachange"));
		});

		this.observer.observe(this.element, {
			childList: true,
			characterData: true,
			subtree: true
		});
	}

	async get () {
		return this.element.textContent;
	}

	async put (serialized) {
		this.observer.disconnect();

		let ret = this.element.textContent = serialized;

		this.observer.observe(this.element, {
			childList: true,
			characterData: true,
			subtree: true
		});

		return ret;
	}

	static test (url) {
		return url.indexOf("#") === 0;
	}
}