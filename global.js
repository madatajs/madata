// Website scripts
import "https://prismjs.com/prism.js";
import "https://prismjs.com/plugins/normalize-whitespace/prism-normalize-whitespace.js";

function renderDemos() {
	for (let code of document.querySelectorAll("pre > code.language-html, pre.language-html > code")) {
		let pre = code.parentNode;

		if (!pre.previousElementSibling?.matches(".demo, .demo-ignore")) {
			code.parentNode.insertAdjacentHTML("beforebegin", `<div class="demo">${code.textContent}</div>`);

			let demoDiv = pre.previousElementSibling;
			let scripts = demoDiv.querySelectorAll("script");

			if (scripts.length > 0) {
				for (let script of scripts) {
					script.replaceWith( clone(script) )
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

renderDemos();

function clone (node){
	let ret = document.createElement(node.tagName);

	ret.innerHTML = node.innerHTML;

	for (let attr of node.getAttributeNames()) {
		ret.setAttribute(attr, node.getAttribute(attr));
	}

	return ret;
}