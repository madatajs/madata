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

The object key is the id of the phrase (not changed) and the value is either a string with the phrase (if there are no parameters)
or a function that takes any relevant variables and returns a string.
You can simply modify this object to localize them to a single language.
If your app needs to support multiple languages, you can implement logic that swaps in one phrase object for another.

</main>