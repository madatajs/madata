import Backend from "../../src/backend.js";
import {$} from "../../src/util.js";

/**
 * Read and write data into an HTML element.
 * @class Element
 * @extends Backend
 */
export default class Element extends Backend {
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

		this.element = $(this.source);

		if (!this.element) {
			document.body.insertAdjacentHTML("beforeend", `<script type="application/json" id="${this.source.slice(1)}"></script>`);
			this.element = document.body.lastChild;
		}

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

	async put (data) {
		this.observer.disconnect();

		this.element.textContent = await this.stringify(data);

		this.observer.observe(this.element, {
			childList: true,
			characterData: true,
			subtree: true
		});

		return {};
	}

	static test (url) {
		return url.indexOf("#") === 0;
	}
}
