import { phrase } from "../../src/util.js";

let styles = `
:host {
	display: flex;
	align-items: center;
	gap: .3em;
}

:host([authenticated]) slot[name="login"],
:host(:not([authenticated])) :is(slot[name="logout"], #status) {
	display: none;
}

#avatar {
	max-height: 1em;
}
`;

export default class MadataAuth extends HTMLElement {
	#backend;
	#progress;
	#dom = {};

	constructor() {
		super();

		this.attachShadow({ mode: "open" });
		this.shadowRoot.innerHTML = this.#template();
		this.#dom.status = this.shadowRoot.querySelector("#status");
		this.#dom.login = this.shadowRoot.querySelector("slot[name=login]");
		this.#dom.logout = this.shadowRoot.querySelector("slot[name=logout]");

		this.#dom.login.addEventListener("click", _ => this.login());
		this.#dom.logout.addEventListener("click", _ => this.logout());

		this.addEventListener("login", _ => {
			this.progress = "";
			let user = this.backend.user;
			this.shadowRoot.querySelector("#username").textContent = user.username;
			this.shadowRoot.querySelector("#avatar").src = user.avatar;
			this.setAttribute("authenticated", "");
		});

		this.addEventListener("logout", _ => {
			this.removeAttribute("authenticated");
		});
	}

	#template () {
		return `<style>${styles}</style>
		<slot></slot>
		<slot name="login">
			<button part="button">${ this.constructor.phrase("log_in") }</button>
		</slot>
		<div id="status">
			<img id="avatar" alt="Avatar" part="avatar" />
			<span id="username" part="username"></span>
		</div>
		<slot name="logout">
			<button part="button">${ this.constructor.phrase("log_out") }</button>
		</slot>
		`;
	}

	get backend() {
		return this.#backend;
	}

	set backend (backend) {
		if (backend && backend !== this.#backend) {
			this.#backend = backend;
			this.#dom.login.style.setProperty("--backend", `"${backend.constructor.title}"`);

			this.backend.addEventListener("mv-login", _ => {
				this.dispatchEvent(new CustomEvent("login"));
			});
			this.backend.addEventListener("mv-logout", _ => {
				this.dispatchEvent(new CustomEvent("logout"));
			});

			this.dispatchEvent(new CustomEvent("backendchange"));
		}
	}

	get progress () {
		return this.#progress;
	}

	set progress (progress) {
		this.#progress = progress;
		if (progress) {
			this.shadowRoot.getElementById("status").dataset.inprogress = progress;
		}
		else {
			delete this.shadowRoot.getElementById("status").dataset.inprogress;
		}
	}

	async login () {
		let ret = this.backend.login();
		this.progress = this.constructor.phrase("logging-in");
		await ret;
		this.progress = "";
		return ret;
	}

	logout () {
		return this.backend.logout();
	}

	static phrases = {
		"logging_in": "Logging in",
		"log_in": "Log in",
		"log_out": "Log out",
	}

	static phrase (id, ...args) {
		return phrase(this, id, ...args);
	}
}

customElements.define("madata-auth", MadataAuth);