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
	}
});

const Sound = mongoose.model("sound", SoundSchema);
module.exports = Sound;