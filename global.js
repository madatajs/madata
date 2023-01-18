// Website scripts
import "https://prismjs.com/prism.js";

function renderDemos() {
	// for (let code of document.querySelectorAll("pre > code.language-html, pre.language-html > code")) {
	// 	let pre = code.parentNode;

	// 	if (!pre.previousElementSibling.matches(".demo")) {
	// 		code.parentNode.insertAdjacentHTML("beforebegin", `<div class="demo">${code.textContent}</div>`);
	// 	}
	// }

	if (!document.documentElement.matches(".no-home-link")) {
		let h1 = document.querySelector("h1");

		if (h1 && !h1.parentNode.querySelector(".home")) {
			h1.insertAdjacentHTML("beforebegin", `<a href="/" class="home">Madata Home</a>`);
		}
	}
}

renderDemos();