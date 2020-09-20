const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv").config();

const passport = require("passport");

const incorrectpassword = { password: "Incorrect password" };

// @route POST api/users/login
// @desc Login user and return JWT token
// @access Public
router.post("/login", (req, res) => {
	console.log("Received login.");
	// Check password
	if (req.body.password === process.env.ADMIN_PASSWORD) {
		// Create JWT payload
		const payload = {
			admin: true,
		};

		// Sign token
		jwt.sign(
			payload,
			process.env.SECRET_OR_KEY,
			{
				expiresIn: 7 * 24 * 60 * 60, // 1 week in seconds
			},
			(err, token) => {
				res.json({
					success: true,
					token: "Bearer " + token,
				});
			}
		);
	} else {
		return res.status(400).json(incorrectpassword);
	}
});

module.exports = router;
