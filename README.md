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
Please try it out, and [open issues](https://github.com/madatajs/madata/issues?q=is%3Aissue+is%3Aopen+sort%3Aupdated-desc) as you find them!

</div>

## Getting Started

Madata provides a unified API for authentication, reading & storing data, as well as file uploads (where supported), regardless of the storage service used.
You don’t need to worry about differences between the different APIs, and swapping one storage service for another is as easy as changing a URL!
Each supported backend documents what kinds of URLs it supports.
Then `Backend.create(url)` automatically gets you an instance of the corresponding backend.

```js
import Backend from "https://madata.dev/src/index.js";

let backend = Backend.create("https://github.com/leaverou/repo/data.json");
let json = await backend.load();

json.happy = true;

await backend.store();

console.log("Stored some data!");
```

## Supported backends

| Service | Auth? | Writes? | Uploads? |
|---------|----|----|-----|
| [GitHub](/backends/github/) | ✅ | ✅ | ✅ |
| [GitHub Gist](/backends/github/) | ✅ | ✅ |  |
| [GitHub API](/backends/github/) | ✅ |  |  |
| [Google Drive](/backends/google/) | ✅ | ✅ | ✅ |
| [Dropbox](/backends/dropbox) | ✅ | ✅ | ✅ |
| [Google Firebase](/backends/google/) | ✅ | ✅ | ✅ |
| [Google Sheets](/backends/google/) | ✅ | ✅ |  |
| [Google Calendar](/backends/google/) | ✅ |  |  |
| [Local storage](/backends/basic/) |  | ✅ |  |
| [HTML Element](/backends/basic/) |  | ✅ |  |
| [Basic remote fetching](/backends/basic/) |  |  |  |

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