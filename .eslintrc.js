module.exports = {
	"env": {
		"browser": true,
		"es2021": true,
		"node": true
	},
	"extends": "eslint:recommended",
	"overrides": [
	],
	"parserOptions": {
		"ecmaVersion": "latest",
		"sourceType": "module"
	},
	"rules": {
		"indent": [
			"error",
			"tab",
			{ "outerIIFEBody": 0 }
		],
		"linebreak-style": [
			"error",
			"unix"
		],
		"quotes": [
			"error",
			"double",
			{ "allowTemplateLiterals": true }
		],
		"curly": "error",
		"semi": [
			"error",
			"always"
		],
		"brace-style": [
			"error",
			"stroustrup",
			{ "allowSingleLine": true }
		],
		"space-before-function-paren": [
			"error",
			"always"
		],
		"no-multiple-empty-lines": [
			"error",
			{ "max": 1, "maxEOF": 0 }
		],
		"no-empty": [
			"error",
			{ "allowEmptyCatch": true }
		]
	}
};