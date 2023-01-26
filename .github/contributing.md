# Madata Contributing Guide

Hi! I'm really excited that you are interested in contributing to Madata.
Before submitting your contribution, please make sure to take a moment and read through the following guidelines.

## Needs

Right now, our main needs are:

- The top priority is tests. We have no tests, and no idea how to even test this, given that so much depends on user accounts, requests etc.
- Documentation. There's a lot that could be documented better or more extensively.
- [API docs](https://madata.dev/api/): We are currently using documentation.js, and it's generating …something.
That something is definitely not good, and we didn't have time to debug why.
Fine to use alternatives to documentation.js as well, though it seems they're all abandonware, or have even worse issues.
- Demos. Because this is relatively low-level, it's hard to explain what it does without good demos.
- Typings

## Development environment

After cloning the repo locally, run `npm install` to install dependencies.

Then run:

- `npm run watch:css` before you work on any `.postcss` files or `npm run build:css` after
- `npm run watch:html` before you work on any `.md` files or `npm run build:html` after
- If you're gonna be doing both of the above, you can run `npm run watch`
- `npm run docs` after you modify any JSDoc annotations (there's no watcher for this)