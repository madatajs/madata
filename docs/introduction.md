# Introduction

## Installation

The quickest option to experiment is to load all Madata modules from its own domain:

```js
import Backend from "https://madata.dev/src/index.js";
```

This loads not only the `Backend` base class, but also every single official backend.
`madata.dev` uses the [Netlify](https://netlify.com) CDN, so it should be pretty fast!

You could also use npm:

```
npm install madata --save
```

## Architecture

Every backend in Madata corresponds to a subclass of `Backend`.
There are more specialized subclasses such as `AuthBackend` for backends that support any form of authentication,
and `OAuthBackend`, offering convenience methods for OAuth 2 backends.

For every backend, there is a set of URL types that it supports.
Most of the time, it is somewhat obvious what these URLs are for each service.

For example, `Github` supports URLs like `https://github.com/username/repo/path/file.json`,
as well as `https://github.com/username/repo/blob/main/path/file.js`
that you get by navigating to a file in the GitHub UI and copying the URL.
Similarly, the `Dropbox` backend supports URLs like `https://www.dropbox.com/s/5fsvey23bi0v8lf/myfile.json?dl=0`
that you get by clicking "Share" on a file on the Dropbox UI.

When there is no "natural" URL for a service, we have invented one, using a custom protocol.
For example, the `Local` backend uses URLs like `local:key`.

You can use `Backend.create(url, options)` to create an appropriate backend based on a URL.
Because storage parameters are encoded in the URL, you could even expose it in your UI,
and give end users a choice about where their data will be stored!

Each `Backend` object also implements an `update()` method which handles changing its associated storage location.
To avoid re-creating backend objects when the storage URL changes,
you can pass in previously created objects through the `existing` parameter:

```js
let backend = Backend.create(url, {
	existing: [github, dropbox, gDrive]
});
```

`Backend.create()` then automatically handles calling `update()` if any of the backends passed are suitable,
and will only create a new object if none are suitable.

