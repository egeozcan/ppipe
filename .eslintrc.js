module.exports = {
	parserOptions: {
		ecmaVersion: 8 // or 2017
	},
	env: {
		browser: true,
		commonjs: true,
		es6: true,
		node: true,
		mocha: true
	},
	extends: "eslint:recommended",
	rules: {
		indent: ["error", "tab", { SwitchCase: 1 }],
		"linebreak-style": ["error", "windows"],
		quotes: ["error", "double"],
		semi: ["error", "always"]
	}
};
