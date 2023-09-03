# Coda Table

| ✅ Auth | ❌ Writes | ❌ Uploads |
|---------|-----------|-----------|

Work in progress. Doesn't work yet.
Writes are not supported yet, but will be soon.

URLs supported:
- Page URL, copied from your browser (`https://coda.io/d/:docSlug/:pageSlug`). The first table from the page will be used.
- Doc URL, copied from your browser (`https://coda.io/d/:docSlug/`). The first table from the doc will be used.
- Raw API URL (`https://coda.io/apis/v1/docs/:docId/tables/:tableId/`). This is the most performant option.

Current limitations:
- Only works with tables, not views
- Only works with tables whose parent is a page