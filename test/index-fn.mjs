// let index = await fetch("./index.json").then(r => r.json());
let index = ["util"];
let tests = await Promise.all(index.map(name => import(`./${name}.mjs`).then(module => module.default)));

export default {
	name: "All Madata tests",
	tests
};
