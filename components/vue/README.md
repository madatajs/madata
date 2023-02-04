# Madata Vue Component

Compatible with Vue 3.

{% raw %}

## Limitations

- You **must** declare the property and set it to an object or array through `data()`
- You must never overwrite the object you passed through `v-model` with another object.
`<ma-data>` relies on having a reference to it that doesn't change.

## Examples

Please note the following examples use Vue’s Options API by importing it directly from a CDN,
however the component is just a regular Vue component, and it works with whatever setup you have.

Simple example (just data loading):

```html
<div id="cats_simple">
	<ma-data v-model="cats" src="https://github.com/leaverou/mv-data/cats2.json"></ma-data>

	<article v-for="cat in cats">
		{{ cat.name }} is {{ cat.age }} years old
	</article>
</div>

<script type=module>
	import { createApp } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
	import MaData from "./madata-vue.js";

	createApp({
		data() {
			return {
				"cats": []
			};
		},

		components: {
			"ma-data": MaData
		}
	}).mount("#cats_simple")
</script>
```

Example with local storage:

```html
<div id="local_storage">
	<ma-data v-model="info" src="local:profile"></ma-data>

	<label>Name: <input v-model="info.name"></label>
	<button @click="info.save()">Update</button>
</div>

<script type=module>
	import { createApp } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
	import MaData from "./madata-vue.js";

	createApp({
		data() {
			return {
				"info": {"name": "Lea Verou"}
			};
		},

		components: {
			"ma-data": MaData
		}
	}).mount("#local_storage")
</script>
```

More advanced example, showcasing authentication, storage, `inProgress` for feedback, passing options.

```html
<div id="advanced_cats">
	<ma-data v-model="cats" :options="{allowForking: true}"
		src="https://github.com/leaverou/mv-data/cats2.json"></ma-data>

	<p>Progress: {{ cats.inProgress }}</p>

	<div v-if="cats.user">
		Logged in as {{ cats.user?.username }}
		<button @click="cats.save()">Save</button>
		<button @click="cats.logout()">Logout</button>
	</div>
	<button v-else @click="cats.login()">Login</button>

	<article v-for="cat in cats">
		<input v-model="cat.name">
		is
		<input type="number" v-model="cat.age">
		years old
	</article>
</div>

<script type=module>
	import { createApp } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
	import MaData from "./madata-vue.js";

	createApp({
		data() {
			return {
				"cats": []
			};
		},

		components: {
			"ma-data": MaData
		}
	}).mount("#advanced_cats")
</script>
```

Also note that you can use `inProgress` to communicate what is happening to the user
(it will be the empty string if nothing is happening)

## Autosave

Autosave calls `save()` when data changes.
It can either be a time string like `"3s"`, `"500ms"`,
or a boolean (the attribute simply being present sets it to `true`).

Example (using element storage so you can see the data):

```html
<div id="autosave_countries">
	<ma-data v-model="countries" src="#data-countries" autosave="2s"></ma-data>

	<article v-for="country in countries">
		<label><input v-model="country.code" /></label>
		<label><input v-model="country.name" /></label>
	</article>
	<button @click="countries.push({})">Add country</button>
</div>

<pre id="data-countries">
[
	{
		"code": "us",
		"name": "United States"
	},
	{
		"code": "gb",
		"name": "United Kingdom"
	}
]
</pre>

<script type=module>
	import { createApp } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
	import MaData from "./madata-vue.js";

	createApp({
		data() {
			return {
				"countries": []
			};
		},

		components: {
			"ma-data": MaData
		}
	}).mount("#autosave_countries")
</script>
```

Avoid enabling autosave when you have a lot of data, as it can slow things down quite a lot!
In those cases, you might be better off just using [event delegation](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#event_delegation)
(monitoring `input` and `change` events at the root and saving then).

## `state` object

By default, `<ma-data>` hangs a bunch of methods and accessors on the data object you pass through `v-model`.
E.g. if the data is `cats`, you will be using `cats.login()` to login,
`cats.save()` to save, `cats.inProgress` to display the current progress etc.

Even though these are not actually saved with the data, you may still wish to keep them separate.
You can pass in another object through the `state` property for that:

```html
<div id="state_object">
	<ma-data v-model="info" :state="state" src="local:profile"></ma-data>

	<label>Name: <input v-model="info.name"></label>
	<button @click="state.save()">Update</button>
</div>

<script type=module>
	import { createApp } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
	import MaData from "./madata-vue.js";

	createApp({
		data() {
			return {
				"info": {"name": "Lea Verou"},
				"state": {}
			};
		},

		components: {
			"ma-data": MaData
		}
	}).mount("#state_object")
</script>
```

Please note you need to declare that object in your data and initialize it with an empty object,
otherwise it will not work!

{% endraw %}
