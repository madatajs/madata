# Advanced Topics

## Tree-shakable API

Madata can be tree-shakable, for smaller bundle sizes.
However, you give up automatic backend selection by storage URL,
since that requires all backends to add themselves onto `Backend.types`
(through `Backend.register(backend)`),
which would prevent them from being tree-shaken.

Instead, you'd be importing the specific backend you need, and constructing objects with that directly.
E.g.

```js
import Github from "https://madata.dev/backends/github/github-file.js";

let backend = new Github("https://github.com/leaverou/health-data/exercise.json");
await backend.load();
```

## Adding support for another service

You need to create a new `Backend` subclass.
For `Backend.create()` to take your class into account, you need to call `Backend.register(MyBackend)`.
You can look at the existing backends for what this should look like.

## Creating plugins

TBD