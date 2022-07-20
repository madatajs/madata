import Google from "./google.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.9.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, useDeviceLanguage } from "https://www.gstatic.com/firebasejs/9.9.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.9.0/firebase-firestore-lite.js";

export default class GoogleFirebase extends Google {
	ready = new Promise((resolve, reject) => {
		const firebaseConfig = {
			apiKey: this.apiKey,
			authDomain: this.file.authDomain,
			databaseURL: this.source,
			projectId: this.file.projectId,
			storageBucket: this.file.storageBucket
		};

		this.app = initializeApp(firebaseConfig);

		if (this.app) {
			resolve(this.app);
		}
		else {
			reject(this.constructor.phrase("could_not_initialize_app"));
		}
	})

	async get (url) {
		let file = url? this.constructor.parseURL(url) : this.file;
		file = this.#applyDefaults(file);

		const firestore = getFirestore();
		const docRef = doc(firestore, file.path);
		
		try {
			const document = await getDoc(docRef);
			if (document.exists()) {
				return document.data();
			}
			else {
				throw new Error(this.constructor.phrase("document_does_not_exist"));
			}
		}
		catch (e) {
			throw new Error(e.message);
		}
	}

	async store (data, {file = this.file, path, ...options} = {}) {
		if (path) {
			file = Object.assign({}, file, {path});
		}

		const firestore = getFirestore();
		const docRef = doc(firestore, file.path);

		try {
			return await setDoc(docRef, data);
		}
		catch (e) {
			throw new Error(e.message);
		}
	}

	async login () {
		await this.ready;

		const auth = getAuth(this.app);
		const provider = new GoogleAuthProvider();

		// Apply the default browser preference.
		useDeviceLanguage(auth);

		try {
			const res = await signInWithPopup(auth, provider);
			this.accessToken = localStorage[this.constructor.tokenKey] = res.user.accessToken;

			const user = await super.login({passive: true});
			if (user) {
				this.updatePermissions({edit: true, save: true});
			}

			return user;
		}
		catch (e) {
			throw new Error(e.message);
		}
	}

	async getUser () {
		if (this.user) {
			return this.user;
		}

		const auth = getAuth();
		const user = auth.currentUser;

		if (user) {
			return this.user = {
				username: user.email,
				name: user.displayName,
				avatar: user.photoURL,
				...user
			};
		}

		return null;
	}

	#applyDefaults (file = this.file) {
		for (const part in GoogleFirebase.defaults) {
			if (file[part] === undefined) {
				file[part] = GoogleFirebase.defaults[part];
			}
		}

		return file;
	}

	static defaults = {
		path: "mv-data/data"
	}

	static test (url) {
		url = new URL(url);
		return url.host.endsWith("firebaseio.com");
	}

	/**
	 * Parse database URL.
	 * @param {string} source Database URL.
	 * @returns Project ID, auth domain, storage bucket.
	 */
	static parseURL (source) {
		const ret = {
			url: new URL(source)
		};

		ret.projectId = ret.url.host.replace(".firebaseio.com", "");
		ret.authDomain = ret.projectId + ".firebaseapp.com";
		ret.storageBucket = ret.projectId + ".appspot.com";

		return ret;
	}
}