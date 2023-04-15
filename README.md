<header class="home no-home-link">

<img src="logo.svg" width="100" alt="Logo showing a cloud presented as a tree" />

<h1 class="logo"><span class="ma">ma</span>data</h1>

Make any cloud service with an API your backend!

</header>

<div id="promo" class="">
Make <span data-alternates="a file on GitHub
a Google Sheet
a GitHub Gist
a file on Dropbox
a Firebase database">any cloud service</span> your backend
</div>

<main>

## What is Madata?

Ever noticed how it's relatively easy to build a client-side JS app,
but once you need to persist data remotely, things get complicated?
Madata bridges that gap, by providing a **unified API for authentication, reading & storing data, as well as file uploads**,
for a number of [supported cloud services](/backends/).
Using Madata, you can develop apps with user accounts and remote storage and host them anywhere that supports hosting static assets.
And what's better, it’s completely **free and open source**!
Madata is an evolution of the storage component of our language [Mavo](https://mavo.io/),
as we got many requests from developers who wanted to use it without the rest of Mavo.

<div class="warning">

**Here be dragons** Madata has not yet been officially released, we are trying a “soft launch” first.
It is currently in pre-alpha and very much a work in progress.
Its API may change. It may have bugs.
Please try it out, and [open issues](https://github.com/madatajs/madata/issues?q=is%3Aissue+is%3Aopen+sort%3Aupdated-desc) as you find them!
Pull requests are welcome too :)

</div>

## Getting Started

While you can [install Madata via npm](https://www.npmjs.com/package/madata), you can also
just use it directly from the CDN (provided by [Netlify](https://www.netlify.com/)):

```js
// Import Madata and all supported backends
import Backend from "https://madata.dev/src/index.js";
```

You then create a `Backend` object by passing a URL to `Backend.from()`:

```js
let backend = Backend.from("https://github.com/leaverou/repo/data.json");
```

You can now call methods like…
- `backend.load()` to read data
- `backend.login()` to authenticate the user
- `backend.logout()` to log the user out
- `backend.store()` to store data
- `backend.upload()` to upload files

These methods are identical for all backends that support them.
This means you can swap one backend for another without having to change your code,
just by changing a URL!

Here is a full example that provides a very bare-bones authentication UI,
reads an object from a JSON file on GitHub,
provides UI for editing the data,
and saves back.

<div class="warning">

This example uses inline event handlers and global variables to keep the code short,
don’t do that in production. :)

</div>

```html
<span id=myUsername></span>
<button id=loginButton onclick="backend.login()">Login</button>
<button id=logoutButton onclick="backend.logout()" hidden>Logout</button>

Value: <input id="valueInput" oninput="json.value = this.value">
<button id=saveButton onclick="backend.store(json)">Save</button>

<script type=module>
import Backend from "https://madata.dev/src/index.js";

globalThis.backend = Backend.from("https://github.com/leaverou/repo/data.json");

backend.addEventListener("mv-login", evt => {
	loginButton.hidden = true;
	myUsername.textContent = backend.user.username;
});

backend.addEventListener("mv-logout", evt => {
	logoutButton.hidden = true;
	myUsername.textContent = "";
});

globalThis.json = (await backend.load()) ?? {value: 0};
valueInput.value = json.value;
</script>
```



<!-- {{ ("--" + ">") | safe }}
{% set backendSummary %}
{% include 'backends/README.md' %}
{% endset %}
{{ backendSummary | md | safe }}
</div>
{{ ("<!" + "--") | safe }} -->
<div class="gh-only">

## Supported backends

Visit [the backends page](/backends/) for the full list.

</div>

## Authentication

- `backend.login()` shows authentication UI
- `backend.login({passive: true})` tries to authenticate the user silently (i.e. if they are already logged in)
It is called automatically when you call `backend.load()` or `backend.store()`.
- `backend.logout()` logs the user out
- `mv-login` and `mv-logout` events are fired on the `Backend` object when the user logs in or out

Read more about [authentication](/docs/authentication/)

## Storage

Save:

```js
let fileInfo = await backend.store(json);
```

## Uploads

For backends that support uploads, this is how simple it could be to create an image uploader:
<p hidden class="demo-ignore"></p>

```html
<input type=file id=uploader>
```

```js
uploadForm.addEventListener("submit", evt => {
	evt.preventDefault();

	let file = uploader.files[0];

	if (file && file.type.startsWith("image/")) {
		backend.upload(file, `images/${file.name}`);
	}
});
```

You can check if `backend.upload` is defined to see if the backend supports image uploads.

</main>
