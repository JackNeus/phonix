const Validator = require("validator");
const isEmpty = require("is-empty");

const acceptedFiletypes = new Set(["wav", "mp3", "m4a", "ogg"]);

module.exports = {
	validateAddSound: function(data, files) {
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

		if (data.is_identify === undefined) {
			errors.is_identify = "Game mode is required";
		}
		if (data.is_creative === undefined) {
			errors.is_creative = "Game mode is required";
		}

		return {
			errors,
			isValid: isEmpty(errors)
		};
	},

	validateEditSound: function(data) {let errors = {};

		data.answer = !isEmpty(data.answer) ? data.answer : "";
		data.accept = !isEmpty(data.accept) ? data.accept : [];

		return {
			errors,
			isValid: isEmpty(errors)
		};
	}
}