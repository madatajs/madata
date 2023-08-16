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
	#inited = {dom: false, api: false};
	#backend;
	#progress;
	#dom = {};

	constructor() {
		super();

		this.attachShadow({ mode: "open" });
		this.shadowRoot.innerHTML = `<style>${styles}</style>
		<slot></slot>
		<slot name="login">
			<button part="button">Log in</button>
		</slot>
		<div id="status">
			<img id="avatar" alt="Avatar" />
			<span id="username"></span>
		</div>
		<slot name="logout">
			<button part="button">Log out</button>
		</slot>
		`;
		this.#dom.status = this.shadowRoot.querySelector("#status");
		this.#dom.login = this.shadowRoot.querySelector("slot[name=login]");
		this.#dom.logout = this.shadowRoot.querySelector("slot[name=logout]");
	}

	connectedCallback() {
		if (this.#inited.dom) {
			return;
		}

		this.#inited.dom = true;

		this.addEventListener("init", _ => {
			this.#dom.login.addEventListener("click", _ => {
				this.backend.login();
				this.progress = "Logging in";
			});
			this.#dom.logout.addEventListener("click", _ => this.backend.logout());

			this.backend.addEventListener("mv-login", _ => {
				this.progress = "";
				let user = this.backend.user;
				this.shadowRoot.querySelector("#username").textContent = user.username;
				this.shadowRoot.querySelector("#avatar").src = user.avatar;
				this.setAttribute("authenticated", "");
			});
			this.backend.addEventListener("mv-logout", _ => {
				this.removeAttribute("authenticated");
			});
		});
	}

	get backend() {
		return this.#backend;
	}

	set backend (backend) {
		this.#backend = backend;
		this.#dom.login.style.setProperty("--backend", `"${backend.constructor.title}"`);
		this.#inited.api = true;
		this.dispatchEvent(new Event("init"));
	}

	get progress() {
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
}

customElements.define("madata-auth", MadataAuth);