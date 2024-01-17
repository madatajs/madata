// Website scripts
import "https://prismjs.com/prism.js";
import "https://prismjs.com/plugins/normalize-whitespace/prism-normalize-whitespace.js";
import "https://prismjs.com/components/prism-typescript.js";

const $$ = document.querySelectorAll.bind(document);

function renderDemos () {
	for (let code of $$("pre > code.language-html, pre.language-html > code")) {
		let pre = code.parentNode;

		if (!pre.previousElementSibling?.matches(".demo, .demo-ignore")) {
			code.parentNode.insertAdjacentHTML("beforebegin", `<div class="demo">${code.textContent}</div>`);

			let demoDiv = pre.previousElementSibling;
			let scripts = demoDiv.querySelectorAll("script");

			if (scripts.length > 0) {
				for (let script of scripts) {
					script.replaceWith( clone(script) );
				}
			}
		}
	}
}

let h1 = document.querySelector("h1");
if (!h1.matches(".no-home-link *")) {
	if (h1 && !h1.parentNode.querySelector(".home")) {
		h1.insertAdjacentHTML("beforebegin", `<a href="../index.html" class="home">Madata</a>`);
	}
}

// Wrap all elements with data-alternates attribute in a div.alternates-container
for (let el of $$("[data-alternates]")) {
	let alternates = el.dataset.alternates.split("\n");
	// alternates.splice(0, 0, el.textContent);
	let wrappedAlternates = alternates.map(alternate => `<div class="alternate">${alternate}</div>`).join("\n");
	el.innerHTML = wrappedAlternates;

	let activeChild = 0;
	el.children[activeChild].classList.add("active");

	setInterval(() => {
		el.children[activeChild].classList.remove("active");
		activeChild = (activeChild + 1) % el.children.length;
		el.children[activeChild].classList.add("active");
	}, 2500);

	// let wrapper = Object.assign(document.createElement("div"), {
	// 	className: "alternates-container",
	// });
	// wrapper.style.setProperty("--alternates-count", el.dataset.alternates.split("\n").length);

	// el.parentNode.insertBefore(wrapper, el);
	// wrapper.appendChild(el);
}

renderDemos();

function clone (node) {
	let ret = document.createElement(node.tagName);

	ret.innerHTML = node.innerHTML;

	for (let attr of node.getAttributeNames()) {
		ret.setAttribute(attr, node.getAttribute(attr));
	}

	return ret;
}
