# Authentication

## Decentralized OAuth Authentication Providers

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

## API

`backend.login()` will display authentication UI to the user.
`backend.login({passive: true})`
will log the user in if they have already logged in previously,
but will not do anything if they have not.
If `backend.login()` results to an actual login,
it resolves to an object with information about the user,
which is also available under `backend.user`

`backend.user` contains various user information.
The following are normalized:
- `backend.user.username`
- `backend.user.name`
- `backend.user.avatar`
- `backend.user.url` (profile URL in remote service)

But `backend.user` will also contain a variety of other information, depending on what is returned from the API.
Please note that some of these may not be available, e.g. if a service does not use avatars, `backend.user.avatar` will be `undefined`.

`backend.logout()` will log the current user out.

If user already has an access token, they will be logged in upon `Backend.create()`,
as the `Backend` constructor calls `backend.login({passive: true})`.

`Backend` objects are also event targets, and fire `mv-login` and `mv-logout` events.

## Examples

Showing auth status to the user:

```js
backend.addEventListener("mv-login", evt => {
	header.classList.add("logged-in");

	let {username, avatar} = backend.user;
	my_username.textContent = username;
	my_avatar.src = avatar;
});

backend.addEventListener("mv-logout", evt => {
	// Hide user-related UI
	header.classList.remove("logged-in");
});
```

To have buttons for login/logout:

```js
loginButton.addEventListener("click", evt => backend.login());
logoutButton.addEventListener("click", evt => backend.logout());
```