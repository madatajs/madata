import AuthBackend from "../../src/auth-backend.js";
import { readFile, toArray } from "../../src/util.js";

import { getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider, useDeviceLanguage } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";
import { getFirestore, doc, collection, getDoc, getDocs, setDoc, addDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore-lite.js";
import { getStorage, ref, uploadString, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-storage.js";

/**
 * Firebase backend.
 */
export default class Firebase extends AuthBackend {
	constructor (url, o) {
		super(url, o);

		this.updatePermissions({ read: true });
	}

	ready = Promise.all([
		super.ready,
		new Promise((resolve, reject) => {
			const firebaseConfig = {
				apiKey: this.options.apiKey,
				authDomain: this.ref.authDomain,
				databaseURL: this.source,
				projectId: this.ref.projectId,
				storageBucket: this.ref.storageBucket
			};

			if (!getApps().length) {
				this.app = initializeApp(firebaseConfig);
			}
			else {
				// We want all apps with the same project ID to share the same instance of the Firebase app.
				// Create one if there is no previously created Firebase app with the specified project ID.
				this.app = getApps().find(app => app.options.projectId === firebaseConfig.projectId) ?? initializeApp(firebaseConfig, firebaseConfig.projectId);
			}

			if (this.app) {
				const auth = getAuth(this.app);
				onAuthStateChanged(auth, async (user) => {
					if (user) {
						await this.login({passive: true});
					}
				});

				resolve(this.app);
			}
			else {
				reject(this.constructor.phrase("could_not_initialize_app"));
			}
		})
	]);

	async get (ref = this.ref) {
		ref = this.#applyDefaults(ref);

		const firestore = getFirestore(this.app);

		if (Firebase.#isCollection(ref)) {
			const collectionRef = collection(firestore, ref.path);

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
			const docRef = doc(firestore, ref.path);

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

	async put (data, {ref = this.ref, path, ...options} = {}) {
		if (path) {
			ref = Object.assign({}, ref, {path});
		}

		const firestore = getFirestore(this.app);

		if (Firebase.#isCollection(ref)) {
			const documents = toArray(data);

			const collectionRef = collection(firestore, ref.path);
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
						const docRef = doc(firestore, ref.path + "/" + id);
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
				const docRef = doc(firestore, ref.path);
				await setDoc(docRef, data);

				// Return document ID.
				return {id: ref.path.split("/").pop()};
			}
			catch (e) {
				throw new Error(e.message);
			}
		}

	}

	async delete (ref) {
		if (ref.inStorage) {
			// Delete from Storage
			const storage = getStorage(this.app);
			try {
				const fileRef = ref(storage, ref.path);
				await deleteObject(fileRef);

				// Return URL of successfully deleted file.
				return ref.path;
			}
			catch (e) {
				throw new Error(e.message);
			}
		}
		else {
			// Delete from Firestore
			if (Firebase.#isCollection(ref)) {
				// Collection deletion is not recommended since it has negative security and performance implications.
				// See https://firebase.google.com/docs/firestore/manage-data/delete-data#collections
				console.warn(this.constructor.phrase("delete_collection_warning"));
				return null;
			}

			const firestore = getFirestore(this.app);
			try {
				const docRef = doc(firestore, ref.path);
				await deleteDoc(docRef);

				// Return the ID of the successfully deleted document.
				return ref.path.split("/").pop();
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

	/**
	 * Get info about the current user, if logged in.
	 * @returns {Promise<object>} - User info
	 */
	async getUser () {
		if (this.user) {
			return this.user;
		}

		if (this.app) {
			const auth = getAuth(this.app);
			const info = auth.currentUser;

			if (info) {
				return this.user = {
					username: info.email,
					name: info.displayName,
					avatar: info.photoURL,
					raw: info,
				};
			}
		}

		return {};
	}

	async login (options) {
		let user = await super.login(options);

		if (user) {
			// TODO figure out actual permissions
			this.updatePermissions({edit: true, save: true});
		}

		return user;
	}

	async passiveLogin () {
		await this.getUser();
	}

	async activeLogin () {
		try {
			const auth = getAuth(this.app);
			const provider = new GoogleAuthProvider();

			// Apply the default browser preference.
			useDeviceLanguage(auth);

			await signInWithPopup(auth, provider);
		}
		catch (e) {
			throw new Error(e.message);
		}
	}

	async logout () {
		try {
			const auth = getAuth(this.app);
			await signOut(auth);
			await super.logout();
		}
		catch (e) {
			throw new Error(e.message);
		}
	}

	#applyDefaults (ref = this.ref) {
		for (const part in Firebase.defaults) {
			ref[part] = this.options[part] ?? Firebase.defaults[part];
		}

		return ref;
	}

	stringify = data => data;
	parse = data => data;

	static #isCollection (ref) {
		const path = ref.path.split("/");

		// The collection path has an odd number of segments
		return path.length % 2 === 1;
	}

	static defaults = {
		path: "madata/data"
	};

	static urls = [
		{ hostname: "{*.}?firebaseio.com" },
		{ hostname: "firebasestorage.googleapis.com" },
	];

	static urlsKnown = [
		{ protocol: "gs", pathname: "//*.appspot.com/*" },
	];

	/**
	 * Parse URL.
	 * @param {string} source Database URL | URL of a file in Firebase Storage.
	 * @returns Project ID, auth domain, storage bucket | A flag whether a file is in Firebase Storage, file URL.
	 */
	static parseURL (source) {
		const ret = super.parseURL(source);

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
	};
}
