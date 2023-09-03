# Github File

| ✅ Auth | ✅ Writes | ✅ Uploads |
|---------|-----------|-----------|

Write & read data and upload files in GitHub repositories.

## URL format

* Regular file URLs like `https://github.com/:owner/:repo/blob/:branch/:path`
* Simplified URLs like `https://github.com/:owner/:repo/:path` (default branch)
* "Raw" URLs like `https://raw.githubusercontent.com/:owner/:repo/:branch/:path`

Note that if the branch name is not in the URL, Madata will try `main`, and then `master`.

## Constructor options

* `allowForking`: Whether to fork on save if logged in user has no permission to push. Defaults to `false`.
* `repoURL`: Public URL to the repo root, if one exists.
This is used to return a URL to the uploaded file from `backend.upload()`.
If not provided, Madata will try GitHub Pages (if enabled), and fall back to [jsdelivr.net](https://www.jsdelivr.com/).
* `commitPrefix`: Optional string to prepend each commit with.