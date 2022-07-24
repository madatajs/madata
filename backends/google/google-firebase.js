import Google from "./google.js";
import { readFile } from "../../src/util.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.9.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, useDeviceLanguage } from "https://www.gstatic.com/firebasejs/9.9.0/firebase-auth.js";
import { getFirestore, doc, collection, getDoc, getDocs, setDoc, addDoc } from "https://www.gstatic.com/firebasejs/9.9.0/firebase-firestore-lite.js";
import { getStorage, ref, uploadString, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.9.0/firebase-storage.js";

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

		if (GoogleFirebase.#isCollection(file)) {
			const collectionRef = collection(firestore, file.path);

			try {
				const documents = [];
				const collection = await getDocs(collectionRef);
				collection.forEach(doc => documents.push({id: doc.id, data: doc.data()}));

				return documents;
			}
			catch (e) {
				throw new Error(e.message);
			}
		}
		else {
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
	}

	async put (data, {file = this.file, path, ...options} = {}) {
		if (path) {
			file = Object.assign({}, file, {path});
		}

		const firestore = getFirestore();

		if (GoogleFirebase.#isCollection(file)) {
			const documents = Array.isArray(data)? data : [data];

			const collectionRef = collection(firestore, file.path);
			const ids = [];
			for (const document of documents) {
				let { id, data } = document;
				if (id === undefined) {
					data ??= {...document};

					try {
						// Generate document ID automatically.
						const docRef = await addDoc(collectionRef, data);
						ids.push(docRef.id);
					}
					catch (e) {}
				}
				else {
					if (data === undefined) {
						data = {...document};
						delete data.id;
					}

					try {
						const docRef = doc(firestore, file.path + "/" + id);
						await setDoc(docRef, data);
						ids.push(id);
					}
					catch (e) {}
				}
			}

			// Return IDs of all successfully stored documents.
			return {ids};
		}
		else {
			try {
				const docRef = doc(firestore, file.path);
				await setDoc(docRef, data);

				// Return document ID.
				return {id: file.path.split("/").pop()};
			}
			catch (e) {
				throw new Error(e.message);
			}
		}
		
	}

	async upload (file, path) {
		const dataURL = await readFile(file);

		try {
			const storage = getStorage();
			const storageRef = ref(storage, path);

			await uploadString(storageRef, dataURL, "data_url");

			return await getDownloadURL(storageRef);
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
			file[part] = this.options[part] ?? GoogleFirebase.defaults[part];
		}

		return file;
	}

	stringify = data => data
	parse = data => data

	static #isCollection (file) {
		const path = file.path.split("/");

		// The collection path has an odd number of segments
		return path.length % 2 === 1;
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