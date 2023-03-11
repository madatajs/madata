<header>

<img src="logo.svg" width="100" alt="Logo showing a cloud presented as a tree" />

# Madata

Make any cloud service with an API your backend!
A spinoff from [Mavo](https://mavo.io).

</header>

<main>

<div class="warning">

**Here be dragons** Madata has not yet been officially released, we are trying a “soft launch” first.
It is currently in pre-alpha and very much a work in progress.
Its API may change. It may have bugs.
Please try it out, and [open issues](https://github.com/madatajs/madata/issues?q=is%3Aissue+is%3Aopen+sort%3Aupdated-desc) as you find them!
Pull requests are welcome too :)

</div>

## Getting Started

Madata provides a unified API for authentication, reading & storing data, as well as file uploads (where supported), regardless of the storage service used.
You don’t need to worry about differences between the different APIs, and swapping one storage service for another is as easy as changing a URL!
Each supported backend documents what kinds of URLs it supports.
Then `Backend.from(url)` automatically gets you an instance of the corresponding backend.

```js
import Backend from "https://madata.dev/src/index.js";

let backend = Backend.from("https://github.com/leaverou/repo/data.json");
let json = await backend.load();

json.happy = true;

await backend.store();

console.log("Stored some data!");
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

### Authentication

Show auth status to the user:

```js
backend.addEventListener("mv-login", evt => {
	header.classList.add("logged-in");

	let user = backend.user;
	my_username.textContent = user.username;
	my_avatar.src = user.avatar;
});

backend.addEventListener("mv-logout", evt => {
	header.classList.remove("logged-in");
});
```

To have buttons for login/logout:

```js
loginButton.addEventListener("click", evt => backend.login());
logoutButton.addEventListener("click", evt => backend.logout());
```

Read more about [authentication](/docs/authentication/)

### Storage

Save:

```js
let fileInfo = await backend.store(json);
```

### Uploads

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