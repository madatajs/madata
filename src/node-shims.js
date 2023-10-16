let localStorage = globalThis.localStorage;

if (!localStorage) {
	localStorage = {
		_data: {},
		setItem (id, val) {
			return this._data[id] = String(val);
		},
		getItem (id) {
			return this._data.hasOwnProperty(id)? this._data[id] : undefined;
		},
		removeItem (id) {
			return delete this._data[id];
		},
		clear () {
			return this._data = {};
		}
	};

	localStorage = new Proxy(localStorage, {
		get (target, prop) {
			if (Reflect.has(target, prop)) {
				return Reflect.get(target, prop);
			}

			return target.getItem(prop);
		},
		set (target, prop, value) {
			if (Reflect.has(target, prop)) {
				return Reflect.set(target, prop, value);
			}

			return target.setItem(prop, value);
		},
		deleteProperty (target, prop) {
			if (Reflect.has(target, prop)) {
				return Reflect.deleteProperty(target, prop);
			}

			return target.removeItem(prop);
		}
	});
}

export {localStorage}