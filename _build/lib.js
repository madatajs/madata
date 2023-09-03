const { exec } = require("child_process");
const packageJson = require("../package.json");

// Set the current working directory to the root of the project
process.chdir(__dirname + "/..");

let dependencies = Object.keys(packageJson.dependencies);
let modules = dependencies.map(dep => `node_modules/${dep}`);
exec(`rm -rf lib && mkdir -p lib && cp -R ${modules.join(" ")} lib`, (err, stdout, stderr) => {
	if (err) {
		console.error(err);
		return;
	}

	console.info(stdout);
	console.error(stderr);
});
console.info(`Copied ${modules.length} dependencies to lib/`);