# GitHub backends

There are three backends here, all using authentication via GitHub:

- GitHub File, for reading/writing repo files and uploading files to repos
- GitHub API, for making API calls (both REST and GraphQL)
- GitHub Gist, for reading and writing GitHub Gists

## Github File

### URLs

* Regular file URLs like `https://github.com/username/repo/blob/main/path/file.js`
* Simplified URLs like `https://github.com/username/repo/path/file.js`
* "Raw" URLs like `https://raw.githubusercontent.com/username/repo/main/path/file.js`

### Constructor options

* `allowForks`: Whether to fork on save if logged in user has no permission to push
* `repoURL`: Public URL to the repo root
* `commitPrefix`: String to prepend each commit with

## Github API

## Github Gist