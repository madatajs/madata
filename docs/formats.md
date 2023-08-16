# Formats

Most of the time you'd be dealing with JSON data, and don’t need to worry about data formats.
However, sometimes you may need to handle data in other formats, such as YAML or CSV.
This is why `Format` objects exist.

## Usage

The Format API generally follows [Alan Kay’s API design princple of “simple things should be simple, complex things should be possible”](https://www.w3.org/TR/design-principles/#simplicity).
Each Format is a class, with two static `parse()` and `stringify()` methods, and two instance `parse()` and `stringify()` methods.
For simple cases that require little to no configuration, you can use the static methods (e.g. `Foo.parse()`),
whereas for more complex cases, you can create an instance of the Format class with the desired options and use its own `parse()` and `stringify()` methods.

## Integration with Backend objects

<div class=warning>

**Warning:** This section is not yet implemented.

</div>

The `Backend` constructor supports a `format` parameter. If specified, the format will
automatically be used to parse and stringify data when the backend reads/writes data respectively

If not using the tree-shakable API, extensions and MIME types specified in Formats will be automatically used to determine the format of a file.

## Defining your own Formats

This is the general structure of a `Format` class:

```js
export default class Foo extends Format {
	static defaultOptions = {
		// ...
	};

	// Associated file extension(s), if any (no need to specify the property if there are none)
	static extensions = ["foo"];

	// MIME type(s), if any (no need to specify the property if there are none)
	static mimeTypes = ["application/foo+json"];

	// You only need to define one pair of parse and stringify methods, see below
	parse (str) { /* ... */ }
	stringify (obj) { /* ... */ }

	static parse(str, options) { /* ... */ }
	static stringify(obj, options) { /* ... */}
}
```

Two ways to implement a Format class:
1. You only define static `parse(str, options)` and `stringify(obj, options)` methods that accept an options object as a second parameter.
You do not need to define the instance methods as well, they will be automatically generated for you (well, inherited).
This is good for cases where specifying the configuration each time is cheap.
1. You only define instance `parse(str)` and `stringify(obj)` methods.
You do not need to define the static methods as well, they will be automatically generated for you (well, inherited),
and will be wrappers around the instance methods of a `ClassName.defaultInstance` object, which will be created the first time they are called.`
This is good for cases where certain options involve upfront costs, such as fetching a whole new module.

Of course, if you want to implement both, that’s fine too.
You could even mix and match: implement a static `parse()` method and an instance `stringify()` method, for example.

### Design Principles for Format classes

- The API should be [idempotent](https://en.wikipedia.org/wiki/Idempotence), whenever possible.
This means that calling `parse(stringify(obj)) === obj` and `stringify(parse(str)) === str` should generally be true.
- Every configuration option must have sensible defaults.