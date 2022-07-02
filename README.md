# Madata

You've got data? Store them anywhere, hassle-free.
Make any cloud service with an API your free remote database.
A spinoff from [Mavo](https://mavo.io).


Reading public data:

```js
import Backend from "https://projects.verou.me/madata/src/index.js";

let backend = Backend.create("https://github.com/leaverou/repo/data.json");

let json = await backend.load();

// Do something with said json
```

Authentication:

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
loginButton.addEventListener(evt => backend.login());
logoutButton.addEventListener(evt => backend.logout());
```

Save:

```js
let fileInfo = await backend.store(json);
```

Questions:
- Should formats be a part of this library?