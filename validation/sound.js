const Validator = require("validator");
const isEmpty = require("is-empty");

const acceptedFiletypes = new Set(["wav", "mp3", "m4a", "ogg"]);

module.exports = function validateSoundInput(data, files) {
	let errors = {};

	data.answer = !isEmpty(data.answer) ? data.answer : "";
	data.accept = !isEmpty(data.accept) ? data.accept : [];

	// File checks
	if (!files || !files.file) {
		errors.file = "File is required";
	}
	else {
		let fileExtension = files.file.name.split(".").pop();
		if (!acceptedFiletypes.has(fileExtension)) {
			errors.file = "Unsupported file type (wav/mp3/m4a/ogg)";
		}
	
	}

	// Answer checks
	if (Validator.isEmpty(data.answer)) {
		errors.answer = "Answer is required";
	}

	return {
		errors,
		isValid: isEmpty(errors)
	};
}