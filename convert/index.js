import Backend from "../src/index.js";
import "../components/auth/index.js";


document.addEventListener("submit", evt => {
	evt.preventDefault();

	let form = evt.target;
	let url = form.querySelector("input[type='url']").value;

	let backend = Backend.from(url);

	let section = form.closest("section");
	let auth = section.querySelector("madata-auth");
	auth.backend = backend;


});