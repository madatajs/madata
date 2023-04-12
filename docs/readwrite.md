# Reading and Writing Data

Reading and writing data is done using four high-level methods on `Backend` instances:

- `backend.load()`
- `backend.store()`
- `backend.remove()`
- `backend.upload()`

All are asynchronous (i.e. return a `Promise` object).
For consistency, they are asynchronous even when wrapping a synchronous API (e.g. `localStorage`).


## Reading data with `backend.load()` { #load }

```ts
async load(url?: string) : Promise<any>;
```

`backend.load()` returns a `Promise` that resolves to the data that was loaded, parsed as JSON.

```js
let data = await backend.load();
```

You can optionally pass in a URL to load data from, which will override the URL passed to the `Backend` constructor.
This can be either an absolute URL, or a relative URL (e.g. `foo.json`).
If it is an absolute URL, do note it would still need to conform to the type the backend handles (e.g. a GitHub URL for the GitHub backend),
otherwise you will get an error.
If it's a relative URL, it is interpreted as a relative path within the storage location indicated by the URL passed to the `Backend` constructor.

```js
let data = await backend.load("foo.json");
```

<div class=warning>

Do note that a relative URL is not interpreted as relative to the URL passed to the `Backend` constructor,
but rather relative to the storage location indicated by that URL.
To use the GitHub example, if you create a Backend with the URL `https://github.com/leaverou/mydata/dir1/dir2/foo.json`,
then `backend.load("bar.json")` will not load `https://github.com/leaverou/mydata/dir1/dir2/bar.json`
but `https://github.com/leaverou/mydata/dir1/dir2/bar.json`

</div>

By default, data is parsed as JSON, but you can customize that by passing `parse` and `stringify` options to the `Backend` constructor.
For example, here we want to store data as CSV,
and thus we are using the PapaParse library to parse and stringify the data:

```js
let backend = Backend.create("https://...", {
	parse: Papa.parse,
	stringify: Papa.unparse
});
```

## Storing data with `backend.store()` { #store }

```ts
async store(data: any, url?: string) : Promise<object | null>;
```

This function stores data to the backend, and returns an object with information about the file and/or the editing operation.

## Deleting files with `backend.remove()` { #remove }

```ts
async remove(url?: string) : Promise<void>;
```

Not every backend supports deleting files, but typically file-based backends (e.g. GitHub File, Google Drive, Dropbox) do.
You can check if `backend.delete` is truthy to see if it's supported.

## Uploading files with `backend.upload()` { #upload }

```ts
async upload(file: File, path?: string) : Promise<string>;
```

This function uploads a [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File) object and returns an absolute URL to that file.

Not every backend supports uploads, but typically file-based backends (e.g. GitHub File, Google Drive, Dropbox) do.
You can check if `backend.upload` is truthy to see if it's supported.
Whether uploads are supported is also listed at the top of the backend's documentation page.