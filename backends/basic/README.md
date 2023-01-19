# Basic backends

These are simple backends, useful for debugging or small demos.

## Local

| ❌ Auth | ✅ Writes | ❌ Uploads |
|---------|-----------|-----------|

**URL format:** `local:foo` where `foo` is the key name that will be used

Stores data in the browser's `localStorage`.

## Element

| ❌ Auth | ✅ Writes | ❌ Uploads |
|---------|-----------|-----------|

**URL format:** A hash, e.g. `#foo` where `foo` is the element id.

Read and write data into an element.
If no such element exists, it will be created (`<script type="application/json">`).

If the element's contents change, the backend will fire a `mv-remotedatachange` event.

## Remote

| ❌ Auth | ❌ Writes | ❌ Uploads |
|---------|-----------|-----------|

**URL format:** *(anything not matched by other backends)*

Load the URL as a remote resource. This is the default backend when `Backend.create()` cannot find any matching backend.