<main>

# Advanced Topics

## Adding support for another service

You need to create a new `Backend` subclass.
For `Backend.create()` to take your class into account, you need to call `Backend.register(MyBackend)`.
You can look at the existing backends for what this should look like.

## Creating your own auth provider

1. First, fork one of the template repos.
We provide template repos for
a) Serverless (Netlify, but can easily be adjusted for other providers): [auth-server-serverless]()
b) PHP: [auth-server-php]()
2. **Make your fork private.** This is essential, since you will be storing secret API keys in it!
3. Register OAuth applications for each service you wish to support.
Edit `_keys.json` to include the API keys of these services.
4. Run `npm run build` to generate `services.json`, which will be a public index of *which* services are supported.

<div class=warning>

We strongly recommend leaving the confirmation step in place (*“Are you sure you want to log in to [URL]?”*).
Since all Madata apps using the same auth provider

</div>

## Creating plugins

TBD

</main>