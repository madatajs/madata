import GoogleCalendarTests from "./calendar/test.js";
import googleDriveTests from "./drive/test.js";
import googleSheetsTests from "./sheets/test.js";

export default {
	name: "Google backends tests",
	tests: [
		GoogleCalendarTests,
		googleDriveTests,
		googleSheetsTests,
	],
};
