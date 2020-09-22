const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv").config();
const fileupload = require("express-fileupload");
const path = require("path");

const passport = require("passport");

const Sound = require("../models/Sound");
const validateSoundInput = require("../validation/sound");

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
		console.log(req.body, req.files);
		const { errors, isValid } = validateSoundInput(req.body, req.files);

		if (!isValid) {
			console.log(errors);
			return res.status(400).json(errors);
		}

		let newSound = new Sound({
			filename: `.${req.files.file.name.split(".").pop()}`,
			answer: req.body.answer,
			accept: req.body.accept
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