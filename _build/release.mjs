// Create a new release

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import process from "process";
import { info } from "console";

// Set the current working directory to the root of the project
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.chdir(path.join(__dirname, ".."));

// Read package.json
// Don’t use parse/stringify as we don’t want to affect the formatting
let packageJson = fs.readFileSync("./package.json", "utf8");

// Update package.json version
// Why not just use `npm version`? It doesn't seem to work well with semver extensions
let currentVersion = packageJson.match(/(?<="version":\s*").+?(?=")/)[0];
if (!currentVersion) {
	throw new Error("Could not read current version from package.json");
}

let args = process.argv.slice(2);
let newVersion;

if (/^\d|v/.test(args[0])) {
	newVersion = args[0];
	args.shift();
}

const dryRun = args[0] !== "--publish";

if (dryRun) {
	info("Dry run. Use --publish to actually make the changes.");
}

if (!newVersion) {
	// Version not provided. Increment last digit of currrent version.
	newVersion = currentVersion.replace(/\d+$/, lastVersionComponent => {
		return parseInt(lastVersionComponent) + 1;
	});
}

if (currentVersion === newVersion) {
	throw new Error(`New version (${newVersion}) is the same as the current version`);
}

packageJson = packageJson.replace(/(?<="version":\s*").+?(?=")/, newVersion);

// Write package.json
if (dryRun) {
	console.log("[Dry run] Would have written to package.json:", packageJson);
}
else {
	fs.writeFileSync("./package.json", packageJson);
}

// Commit change
run(`git add package.json && git commit -m "Bump version to ${newVersion}"`, { verbose: true, dryRun });

// Tag commit
run(`git tag -a v${newVersion} -m "Release v${newVersion}"`, { verbose: true, dryRun });



// Push commit and tag
run("git push && git push --tags", { verbose: true, dryRun });

// Publish to npm
run("npm publish", { verbose: true, dryRun });

function run(command, { dryRun, verbose }) {
	if (verbose || dryRun) {
		console.info(`${ dryRun? "[Dry run] " : ""} Running command: ${command}`);
	}

	if (!dryRun) {
		execSync(command, (err, stdout, stderr) => {
			if (err) {
				throw err;
			}

			if (verbose) {
				console.info(stdout);
				console.error(stderr);
			}
		});
	}

}