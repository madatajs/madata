/**
 * Save in an HTML element
 * @class Element
 */

import Backend from "../../src/backend.js";
import {$} from "../../src/util.js";

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