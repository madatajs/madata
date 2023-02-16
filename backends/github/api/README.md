# Github API

| ✅ Auth | ❌ Writes | ❌ Uploads |
|---------|-----------|-----------|

**URL format** Any URL with a host of `api.github.com`

Allows you to perform raw API calls, either with the REST or GraphQL API.
If using GraphQL, the query can be provided either as a URL hash (`#query{...}`) or as a separate `query` constructor option.

Automatically deals with pagination, just add `max_pages=N` to your URL (where N is the number of pages you want to fetch as a maximum).
Note this can incur up to N HTTP requests, depending on the size of the data.