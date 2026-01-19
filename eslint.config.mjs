import globals from "globals";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";

export default tseslint.config(
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	eslintPluginPrettier,
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
				...globals.mocha,
			},
			parserOptions: {
				ecmaVersion: 2017,
			},
		},
		rules: {
			"prettier/prettier": "error",
			"one-var": ["error", "never"],
			"one-var-declaration-per-line": ["error", "always"],
			"operator-assignment": ["error", "always"],
			"operator-linebreak": "off",
			"max-statements-per-line": [
				"error",
				{
					max: 1,
				},
			],
			eqeqeq: ["error", "always"],
			"no-multiple-empty-lines": [
				"error",
				{
					max: 1,
				},
			],
			"no-unexpected-multiline": "error",
			"no-unreachable": "error",
			"no-extra-boolean-cast": "off",
			"no-unused-vars": "off",
			"@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
			"no-empty": "error",
			"no-useless-escape": "off",
			"comma-spacing": [
				"error",
				{
					before: false,
					after: true,
				},
			],
			"no-undef": "off",
			"no-console": "warn",
			"block-spacing": ["error", "always"],
			yoda: "error",
			"arrow-spacing": "error",
			"function-call-argument-newline": ["error", "consistent"],
			"no-extra-semi": "error",
			"no-control-regex": "error",
			"no-global-assign": "error",
			"no-redeclare": "off",
			"@typescript-eslint/no-redeclare": "error",
			"no-cond-assign": "error",
			"key-spacing": [
				"error",
				{
					beforeColon: false,
				},
			],
			"array-bracket-spacing": ["error", "never"],
			"array-bracket-newline": ["error", "consistent"],
			"array-element-newline": ["error", "consistent"],
			"spaced-comment": [
				"error",
				"always",
				{
					exceptions: ["-", "+"],
				},
			],
			"object-curly-spacing": ["error", "always"],
			"object-curly-newline": [
				"error",
				{
					consistent: true,
				},
			],
			"object-property-newline": [
				"error",
				{
					allowAllPropertiesOnSameLine: true,
				},
			],
			curly: "error",
			"no-mixed-operators": "error",
			"arrow-body-style": ["error", "as-needed"],
			"arrow-parens": "error",
			"no-confusing-arrow": "error",
			"prefer-arrow-callback": "error",
			"max-len": [
				"error",
				{
					code: 120,
					tabWidth: 4,
				},
			],
			"array-callback-return": "error",
			"brace-style": ["error", "1tbs"],
			"no-prototype-builtins": "off",
			"prefer-const": "error",
			camelcase: [
				"error",
				{
					properties: "never",
					ignoreDestructuring: false,
				},
			],
			"no-var": "error",
			"class-methods-use-this": "error",
			"default-param-last": "off",
			"@typescript-eslint/default-param-last": "error",
			"no-alert": "error",
			"no-caller": "error",
			"comma-dangle": "off",
			"no-constructor-return": "error",
			"no-else-return": "error",
			"dot-location": ["error", "property"],
			"max-classes-per-file": ["error", 1],
			semi: ["error", "always"],
			"semi-spacing": [
				"error",
				{
					before: false,
					after: true,
				},
			],
			"semi-style": ["error", "last"],
			"padded-blocks": [
				"error",
				"never",
				{
					allowSingleLineBlocks: true,
				},
			],
			"space-before-blocks": "error",
			"space-in-parens": ["error", "never"],
			"space-infix-ops": "error",
			"no-multi-spaces": "error",
			"space-unary-ops": [
				"error",
				{
					words: true,
					nonwords: false,
					overrides: {},
				},
			],
			"switch-colon-spacing": [
				"error",
				{
					after: true,
					before: false,
				},
			],
			"dot-notation": "error",
			"padding-line-between-statements": [
				"error",
				{
					blankLine: "always",
					prev: "expression",
					next: "block-like",
				},
				{
					blankLine: "always",
					prev: "block-like",
					next: "expression",
				},
				{
					blankLine: "always",
					prev: "*",
					next: "import",
				},
				{
					blankLine: "always",
					prev: "*",
					next: "return",
				},
				{
					blankLine: "always",
					prev: "import",
					next: "*",
				},
				{
					blankLine: "any",
					prev: "import",
					next: "import",
				},
				{
					blankLine: "always",
					prev: ["const", "let", "var"],
					next: "*",
				},
				{
					blankLine: "always",
					prev: "*",
					next: ["const", "let", "var"],
				},
				{
					blankLine: "any",
					prev: ["const", "let", "var"],
					next: ["const", "let", "var"],
				},
			],
			// Disable ALL TypeScript escape hatches
			"@typescript-eslint/no-explicit-any": "error",
			"@typescript-eslint/ban-ts-comment": [
				"error",
				{
					"ts-expect-error": true,
					"ts-ignore": true,
					"ts-nocheck": true,
					"ts-check": false,
				},
			],
			"@typescript-eslint/no-non-null-assertion": "error",
			"@typescript-eslint/consistent-type-assertions": [
				"error",
				{
					assertionStyle: "never",
				},
			],
			"@typescript-eslint/no-empty-object-type": "off",
		},
	},
	{
		ignores: ["dist/", "dist-test/", "node_modules/"],
	},
);
