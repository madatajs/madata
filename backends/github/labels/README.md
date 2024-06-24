# Github Labels

| ✅ Auth | ✅ Writes | ❌ Uploads |
|---------|-----------|-----------|

**URL format**
* Labels for a repository: `https://github.com/{owner}/{repo}/labels` or `https://api.github.com/repos/{owner}/{repo}/labels`
* Labels for an issue: `https://github.com/{owner}/{repo}/issues/{issue_number}/labels` or `https://api.github.com/repos/{owner}/{repo}/issues/{issue_number}/labels`
* Labels for issues in a milestone: `https://github.com/{owner}/{repo}/milestones/{milestone_number}/labels` or `https://api.github.com/repos/{owner}/{repo}/milestones/{milestone_number}/labels`

Builds on the [Github API](../api/) backend, so it also automatically deals with pagination, just add `max_pages=N` to your URL (where `N` is the number of pages you want to fetch as a maximum). Note this can incur up to `N` HTTP requests, depending on the size of the data.

By default, you can create, update, and delete labels. Don't want the backend to perform some of these? No problem. You can restrict allowed operations to any subset with the `allow` option if needed. Its value is a _space-separated_ list of permitted operations' names (in any order), like so: `backend.store(labels, { allow: "create update" }`.
