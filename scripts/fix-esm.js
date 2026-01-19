#!/usr/bin/env node
/**
 * Post-build script to fix ESM output for Node.js compatibility:
 * 1. Adds .js extensions to relative imports (Node ESM requires explicit extensions)
 * 2. Creates package.json with "type": "module" marker
 */

const fs = require("fs");
const path = require("path");

const ESM_DIR = path.join(__dirname, "..", "dist", "esm");

// Add .js extensions to relative imports
for (const file of fs.readdirSync(ESM_DIR)) {
	if (!file.endsWith(".js")) {
		continue;
	}

	const filePath = path.join(ESM_DIR, file);
	let content = fs.readFileSync(filePath, "utf8");

	// Match: from "./foo" or from "../foo" (without .js)
	content = content.replace(
		/from\s+["'](\.[^"']+)["']/g,
		(match, importPath) => {
			if (importPath.endsWith(".js")) {
				return match;
			}

			return `from "${importPath}.js"`;
		}
	);

	fs.writeFileSync(filePath, content);
}

// Create ESM package.json marker
fs.writeFileSync(path.join(ESM_DIR, "package.json"), '{"type":"module"}\n');

console.log("ESM build fixed: added .js extensions and package.json marker");
