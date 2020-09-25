const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv").config();
const fileupload = require("express-fileupload");
const path = require("path");

const passport = require("passport");

const Sound = require("../models/Sound");
const validate = require("../validation/sound");

const soundnotfound = { sound: "Sound not found." };

// @route GET api/sounds
// @desc Return all sounds
// @access Private
router.get("/sounds", 
	passport.authenticate("user-strategy", { session: false }),
	(req, res) => {
		Sound.find().then((data, err) => {
			if (err) {
				res.send(500);
			} else {
				res.json(data);
			}
		});
	}
);

// @route POST api/sound
// @desc Add sound
// @access Private
router.post("/sound",
	passport.authenticate("user-strategy", { session: false }),
	(req, res) => {
		const { errors, isValid } = validate.validateAddSound(req.body, req.files);

		if (!isValid) {
			console.log(errors);
			return res.status(400).json(errors);
		}
		console.log(req.body.accept);
		let newSound = new Sound({
			filename: `.${req.files.file.name.split(".").pop()}`,
			answer: req.body.answer,
			accept: req.body.accept,
			is_identify: req.body.is_identify,
			is_creative: req.body.is_creative,
		});

		newSound
			.save()
			.then((sound) => {
				// Initially filename is just the filetype because we are
				// waiting for the document id to be generated. Upon saving
				// rectify this and resave.
				sound.filename = sound._id + sound.filename;
				sound.save();

				// Upload file.
				let fullPath = path.resolve(__dirname, "../assets/", sound.filename);
				req.files.file.mv(fullPath)
					.then(() => { res.json(sound); })
					.catch(err => {
						// Couldn't upload file, delete db object.
						Sound.deleteOne({_id: sound._id});
						res.send(500);
					});
			})
			.catch((err) => {
				console.log(err);
				res.send(500);
			});
	}
);

// @route PUT api/sound/:id
// @desc Edit sound
// @access Private
router.put("/sound/:id",
	passport.authenticate("user-strategy", { session: false }),
	(req, res) => {
		const { errors, isValid } = validate.validateEditSound(req.body);

		if (!isValid) {
			console.log(errors);
			return res.status(400).json(errors);
		}
		
		Sound.findOne({_id: req.params.id}).then((sound) => {
			if (!sound) return res.status(400).json(soundnotfound);
			if (req.body.answer) sound.answer = req.body.answer;
			if (req.body.accept) sound.accept = req.body.accept;
			if (req.body.is_identify !== undefined) sound.is_identify = req.body.is_identify;
			if (req.body.is_creative !== undefined) sound.is_creative = req.body.is_creative;
			sound.save();
			res.json(sound);
		});
	}
);

// @route DELETE api/sound/:id
// @desc Delete sound
// @access Private
router.delete("/sound/:id", 
	passport.authenticate("user-strategy", { session: false }),
	(req, res) => {
		Sound.deleteOne({_id: req.params.id }).then((resp) => {
			if (resp.deletedCount !== 1) {
				res.status(400).json(soundnotfound);
			} else {
				res.status(200).json({
					success: true,
				});
			}
		});
	}
);


module.exports = router;
