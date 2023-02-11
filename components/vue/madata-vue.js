import Backend from "../../src/index.js";

const exportOnData = [
	"login", "logout",
	"save", "upload",
	"backend",
]

const DataStore = {
	props: {
		src: String,
		modelValue: Object,
		options: Object,
		autosave: {
			type: [Boolean, Number, String],
			default: false,
			validator (value) {
				try {
					parseTime(value);
					return true;
				}
				catch (e) {
					return false;
				}
			}
		},
		state: Object,
	},

	emits: ["update:modelValue"],

	data() {
		return {
			inProgress: "",
			unsavedChanges: false,
			user: null
		}
	},

	mounted () {
		// TODO if we attach this when modelValue is set, we can handle cases where the data gets replaced
		if (!this.modelValue || !Array.isArray(this.modelValue) && typeof this.modelValue !== "object") {
			throw new TypeError("DataStore: data must be an object or array");
		}

		if (this.state && typeof this.state !== "object") {
			throw new TypeError("State needs to be an object if present. Value passed was:", this.state);
		}

		let state = this.state ?? this.modelValue;

		for (let property of exportOnData) {
			Object.defineProperty(state, property, {
				value: this[property],
			});
		}

		let getters = {
			inProgress: () => this.inProgress,
			user: () => this.user,
			username: () => this.user?.username,
			name: () => this.user?.name,
			url: () => this.user?.url,
			avatar: () => this.user?.avatar,
		}

		for (let property in getters) {
			Object.defineProperty(state, property, {
				get: getters[property]
			});
		}
	},

	watch: {
		src: {
			async handler (url, oldUrl) {
				this.pastBackends ??= new Set();

				if (this.backend) {
					this.pastBackends.add(this.backend);
				}

				let options = {};

				if (this.pastBackends.size > 0) {
					options.existing = [...this.pastBackends];
				}

				if (this.options) {
					Object.assign(options, this.options);
				}

				this.backend = Backend.create(url, options);

				return this.load();
			},
			immediate: true,
		},

		autosave: {
			handler (autosave) {
				if (autosave) {
					this.unwatchData = this.$watch("modelValue", (newData, oldData) => {
						if (autosave === true) {
							// If autosave is just used without a value, we save immediately
							this.save();
						}
						else {
							let ms = parseTime(autosave);

							// Throttle
							clearTimeout(this.saveTimeout);
							this.saveTimeout = setTimeout(() => {
								this.save();
							}, ms);
						}
					}, {deep: true});
				}
				else {
					this.unwatchData?.();
				}
			},
			immediate: true,
		}
	},

	methods: {
		async login (o) {
			this.inProgress = "Logging in...";
			await this.backend.login(o);
			this.inProgress = "";
			return this.user = this.backend.user;
		},

		async logout () {
			await this.backend.logout();
			this.user = this.backend.user;
		},

		async load () {
			let data = await this.backend.load();
			// load() also calls login({passive: true})
			this.user = this.backend.user;

			// Replace data maintaining a reference to its object
			if (Array.isArray(this.modelValue)) {
				// Delete existing items
				this.modelValue.splice(0, this.modelValue.length);

				// Add new items
				if (Array.isArray(data)) {
					this.modelValue.push(...data);
				}
				else if (data !== null) {
					console.warn("DataStore: Data is not an array: ", data);
				}
			}
			else { // Object
				// Delete old data
				for (let key in this.modelValue) {
					delete this.modelValue[key];
				}
				// Add new data
				Object.assign(this.modelValue, data);
			}

			this.unsavedChanges = false;

			this.$emit("update:modelValue", this.modelValue);
		},

		async save () {
			this.inProgress = "Saving...";
			let ret = await this.backend.store(this.modelValue);
			this.inProgress = "";
			this.unsavedChanges = false;
			return ret;
		},

		async upload (file) {
			this.inProgress = "Uploading...";
			let ret = await this.backend.upload(file);
			this.inProgress = "";
			return ret;
		}
	},

	template: " "
}

function parseTime (time) {
	if (typeof time === "number" || typeof time === "boolean") {
		return time;
	}
	else if (typeof time === "string") {
		let match = time.trim().match(/^(?<number>\d+(\.\d+)?)\s*(?<unit>ms|s)?$/);

		if (match) {
			return match.groups.number * (match.groups.unit === "s" ? 1000 : 1)
		}
	}

	throw new TypeError("Invalid time");
}

export default DataStore;