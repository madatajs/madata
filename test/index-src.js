let tests = await Promise.all([
	"backend",
	"util",
].map(name => import(`./${name}.js`).then(module => module.default)));

export default {
	name: "Tests for all modules from the src folder",
	tests,
};
