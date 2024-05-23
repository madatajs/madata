# Github Labels

| ✅ Auth | ✅ Writes | ❌ Uploads |
|---------|-----------|-----------|

**URL format** Any URL that starts with `https://api.github.com/repos/` and ends with `/labels`
* Labels for a repository: `/repos/{owner}/{repo}/labels`
* Labels for an issue: `/repos/{owner}/{repo}/issues/{issue_number}/labels`
* Labels for issues in a milestone: `/repos/{owner}/{repo}/milestones/{milestone_number}/labels`

Builds on the [Github API](../api/) backend, so it also automatically deals with pagination, just add `max_pages=N` to your URL (where N is the number of pages you want to fetch as a maximum). Note this can incur up to N HTTP requests, depending on the size of the data.