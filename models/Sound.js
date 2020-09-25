const mongoose = require("mongoose");

const SoundSchema = new mongoose.Schema({
	filename: {
		type: String,
		required: true,
	},
	answer: {
		type: String,
		required: true,
	},
	accept: {
		type: [String],
		required: false,
	},
	is_identify: {
		type: Boolean,
		default: true,
		required: false,
	},
	is_creative: {
		type: Boolean,
		default: false,
		required: false,
	}
});

const Sound = mongoose.model("sound", SoundSchema);
module.exports = Sound;