---
js: true
---
# Madata Authentication Widget

A barebones but highly customizable framework-agnostic web component to facilitate authentication for backends that require it.

```html
<madata-auth id="gh_auth"></madata-auth>
<script type="module">
import Backend from "https://madata.dev/src/index.js";
let auth = document.querySelector("#gh_auth");
let backend = Backend.from("https://github.com");
auth.backend = backend;
</script>
```

Customization with slots:

```html
<madata-auth id="gs_auth">
	Google Sheets:
	<button slot="login">Let me in!</button>
	<button slot="logout">Let me out!</button>
</madata-auth>
<script type="module">
import Backend from "https://madata.dev/src/index.js";
let auth = document.querySelector("#gs_auth");
let backend = Backend.from("https://docs.google.com/spreadsheets/d/13SdiaC9YQ8PwrMNvtd8n8qRhh90aOq96hr4jUgt0Efg/edit#gid=0");
auth.backend = backend;
</script>
```