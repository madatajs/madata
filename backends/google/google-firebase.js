/**
 * Google Firebase backend.
 * @class GoogleFirebase
 * @extends Google
 */
import Google from "./google.js";
import { readFile, toArray } from "../../src/util.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, useDeviceLanguage } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, doc, collection, getDoc, getDocs, setDoc, addDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore-lite.js";
import { getStorage, ref, uploadString, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-storage.js";

export default class GoogleFirebase extends Google {
	ready = Promise.all([
		super.ready,
		new Promise((resolve, reject) => {
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
	]);

	async get (file) {
		file = this.#applyDefaults(file);

		const firestore = getFirestore(this.app);

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

		const firestore = getFirestore(this.app);

		if (GoogleFirebase.#isCollection(file)) {
			const documents = toArray(data);

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

	async delete (file) {
		if (file.inStorage) {
			// Delete from Storage
			const storage = getStorage(this.app);
			try {
				const fileRef = ref(storage, file.path);
				await deleteObject(fileRef);

				// Return URL of successfully deleted file.
				return file.path;
			}
			catch (e) {
				throw new Error(e.message);
			}
		}
		else {
			// Delete from Firestore
			if (GoogleFirebase.#isCollection(file)) {
				// Collection deletion is not recommended since it has negative security and performance implications.
				// See https://firebase.google.com/docs/firestore/manage-data/delete-data#collections
				console.warn(this.constructor.phrase("delete_collection_warning"));
				return null;
			}

			const firestore = getFirestore(this.app);
			try {
				const docRef = doc(firestore, file.path);
				await deleteDoc(docRef);

				// Return the ID of the successfully deleted document.
				return file.path.split("/").pop();
			}
			catch (e) {
				throw new Error(e.message);
			}
		}
	}

	async upload (file, path) {
		const dataURL = await readFile(file);

		try {
			const storage = getStorage(this.app);
			const storageRef = ref(storage, path);

			await uploadString(storageRef, dataURL, "data_url");

			return await getDownloadURL(storageRef);
		}
		catch (e) {
			throw new Error(e.message);
		}
	}

	async login ({ passive } = {}) {
		await this.ready;

		if (!passive) {
			try {
				const auth = getAuth(this.app);
				const provider = new GoogleAuthProvider();

				// Apply the default browser preference.
				useDeviceLanguage(auth);

				const res = await signInWithPopup(auth, provider);
				const credential = GoogleAuthProvider.credentialFromResult(res);
				this.accessToken = localStorage[this.constructor.tokenKey] = credential.accessToken;
				this.user = res.user;
			}
			catch (e) {
				throw new Error(e.message);
			}
		}

		const user = await super.login({ passive: true });
		if (user) {
			this.updatePermissions({ edit: true, save: true });
		}

		return user;
	}

	async getUser () {
		if (this.user) {
			return this.user;
		}

		const auth = getAuth(this.app);
		const user = auth.currentUser;

		if (user) {
			return this.user = {
				username: user.email,
				name: user.displayName,
				avatar: user.photoURL,
				...user
			};
		}
		else {
			return super.getUser();
		}
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
		path: "madata/data"
	}

	static test (url) {
		url = new URL(url);
		return url.host.endsWith("firebaseio.com");
	}

	/**
	 * Parse URL.
	 * @param {string} source Database URL | URL of a file in Firebase Storage.
	 * @returns Project ID, auth domain, storage bucket | A flag whether a file is in Firebase Storage, file URL.
	 */
	static parseURL (source) {
		const ret = {
			url: new URL(source)
		};

		if (ret.url.host === "firebasestorage.googleapis.com" || ret.url.protocol === "gs:") {
			ret.inStorage = true;
			ret.path = source;
		}
		else {
			ret.projectId = ret.url.host.replace(".firebaseio.com", "");
			ret.authDomain = ret.projectId + ".firebaseapp.com";
			ret.storageBucket = ret.projectId + ".appspot.com";
		}

		return ret;
	}

	static phrases = {
		delete_collection_warning: "Deleting collections from a Web client is not recommended. See https://firebase.google.com/docs/firestore/manage-data/delete-data#collections for details."
	}
}
