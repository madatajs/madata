<header>

# Madata

Make any cloud service with an API your free remote database.
A spinoff from [Mavo](https://mavo.io).

</header>

<main>

## Getting Started

Madata provides a unified API for authentication, reading, uploads, and storage, regardless of the storage service used.
You don’t need to worry about differences between the different APIs, and swapping one storage service for another is as easy as changing a URL!
Each supported backend documents what kinds of URLs it supports.
Then `Backend.create(url)` automatically gets you an instance of the corresponding backend.

Reading public data:

```js
import Backend from "https://projects.verou.me/madata/src/index.js";

let backend = Backend.create("https://github.com/leaverou/repo/data.json");

let json = await backend.load();

// Do something with said json
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

#### Decentralized OAuth Authentication Providers

Backends that support authentication fall in two main categories:
(a) [OAuth](https://en.wikipedia.org/wiki/OAuth) backends
(b) backends doing their own authentication.

For (a), Madata introduces the concept of a *decentralized auth(entication) provider*,
so you can experiment with different backends without having to register an OAuth application with each of those services.
Instead, the auth provider has registered an OAuth app for all the backends it supports,
facilitates the OAuth handshake for you, and communicates the access token back to Madata so it can store it in the user's browser.

The whole purpose of the auth provider is to handle acquiring the initial access token for a user's first login.
After that, the access token is cached in the browser’s `localStorage` until it expires, usually not for months or even years,
and the user doesn’t need to make any further requests to the auth provider.
For this reason, the bandwidth and CPU requirements for hosting an auth provider are very low,
even if it serves thousands of users.

You can choose an existing open authentication server, or [self-host your own](/docs/advanced/).

Here are some open authentication servers you can use:
- [`https://auth.madata.dev`](https://auth.madata.dev)
- [`https://auth.mavo.io`](https://auth.mavo.io)

Each auth server supports certain backends and may not support the full range of backends Madata supports.
Visiting the server's homepage should tell you which backends it supports.
You could also programmatically fetch `{{ auth_server_url }}/services` to programmatically read which services are supported.

The default auth provider is `https://auth.madata.dev` but you can customize it like so:

```js
Backend.authProvider = "https://auth.example.com";
```

### API

`backend.login()` will display authentication UI to the user. `backend.login({passive: true})`
will log the user in if they have already logged in previously,
but will not do anything if they have not.
`backend.logout()` will log the current user out.

`backend.user` contains various user information.
The following are normalized:
- `backend.user.username`
- `backend.user.name`
- `backend.user.avatar`
- `backend.user.url` (profile URL in remote service)

But `backend.user` will also contain a variety of other information, depending on what is returned from the API.
Please note that some of these may not be available, e.g. if a service does not use avatars, `backend.user.avatar` will be `undefined`.

If user already has an access token, they will be logged in upon `Backend.create()`, as it calls `backend.login({passive: true})`.

So to show auth status to the user:

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

Save:

```js
let fileInfo = await backend.store(json);
```


</main>