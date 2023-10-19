import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import process from "process";

// Set the current working directory to the root of the project
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.chdir(path.join(__dirname, ".."));

// Read package.json
const packageJson = JSON.parse(fs.readFileSync("./package.json", "utf8"));

// FIXME This will only work for modules that *either* don’t have dependencies *or* provide a bundled version
let dependencies = Object.keys(packageJson.dependencies);
console.info(`Found ${dependencies.length} dependencies: ${ dependencies.join(", ") }`);

let modules = dependencies.map(dep => `node_modules/${dep}`);
execSync(`rm -rf lib && mkdir -p lib && cp -R ${modules.join(" ")} lib`, (err, stdout, stderr) => {
	if (err) {
		throw err;
	}

	console.info(stdout);
	console.error(stderr);
});

console.info(`Copied ${modules.length} dependencies to lib/`);