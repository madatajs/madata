<main>

# Localization

All error messages in Madata are localizable.
Each `Backend` subclass includes the phrases it may need under the static `phrases` property.

For example, from `oauth-backend.js`:

```js
static phrases = {
	"popup_blocked": "Login popup was blocked! Please check your popup blocker settings.",
	"something_went_wrong_while_connecting": name => "Something went wrong while connecting to " + name,
}
```

</main>