Backends are at the core of Madata.
They are the adapters to the different services and data sources supported by Madata.
You can read about how to use them in the [docs](/docs/).

## Supported backends

| Service | Auth? | Writes? | Uploads? |
|---------|----|----|-----|
| [GitHub Files](/backends/github/file/) | ✅ [GitHub](/backends/github/) | ✅ | ✅ |
| [GitHub Gist](/backends/github/gist/) | ✅ [GitHub](/backends/github/) | ✅ |  |
| [GitHub API](/backends/github/api/) | ✅ [GitHub](/backends/github/) |  |  |
| [GitHub Labels](/backends/github/labels/) | ✅ [GitHub](/backends/github/) | ✅ |  |
| [Dropbox](/backends/dropbox/) | ✅ | ✅ | ✅ |
| [Firebase](/backends/firebase/) | ✅ | ✅ | ✅ |
| [Google Drive](/backends/google/drive/) | ✅ [Google](/backends/google/) | ✅ | ✅ |
| [Google Sheets](/backends/google/sheets/) | ✅ [Google](/backends/google/) | ✅ |  |
| [Google Calendar](/backends/google/calendar/) | ✅ [Google](/backends/google/) |  |  |
| [Local storage](/backends/basic/#local) |  | ✅ |  |
| [HTML Element](/backends/basic/#element) |  | ✅ |  |
| [Basic remote fetching](/backends/basic/#remote) |  |  |  |