# GitHub backends

There are three backends here, all using authentication via GitHub:

- GitHub File, for reading/writing repo files and uploading files to repos
- GitHub API, for making API calls (both REST and GraphQL)
- GitHub Gist, for reading and writing GitHub Gists

## Github File

| ✅ Auth | ✅ Writes | ✅ Uploads |
|---------|-----------|-----------|

Write & read data and upload files in GitHub repositories.

### URL format

* Regular file URLs like `https://github.com/username/repo/blob/main/path/file.js`
* Simplified URLs like `https://github.com/username/repo/path/file.js`
* "Raw" URLs like `https://raw.githubusercontent.com/username/repo/main/path/file.js`

Note that if the branch name is not in the URL, Madata will try `main`, and then `master`.

### Constructor options

* `allowForking`: Whether to fork on save if logged in user has no permission to push. Defaults to `false`.
* `repoURL`: Public URL to the repo root, if one exists.
This is used to return a URL to the uploaded file from `backend.upload()`.
If not provided, Madata will try GitHub Pages (if enabled), and fall back to [jsdelivr.net](https://www.jsdelivr.com/).
* `commitPrefix`: Optional string to prepend each commit with.

## Github API

| ✅ Auth | ❌ Writes | ❌ Uploads |
|---------|-----------|-----------|

**URL format** Any URL with a host of `api.github.com`

Allows you to perform raw API calls, either with the REST or GraphQL API.
If using GraphQL, the query can be provided either as a URL hash (`#query{...}`) or as a separate `query` constructor option.

## Github Gist

| ✅ Auth | ✅ Writes | ❌ Uploads |
|---------|-----------|-----------|

**URL format** Any URL with a host of `gist.github.com`