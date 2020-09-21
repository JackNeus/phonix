const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv").config();

const passport = require("passport");

const Admin = require("../models/Sound");

// @route GET api/sounds
// @desc Return all sounds
// @access Private
router.get("/login", 
	passport.authenticate("user-strategy", { session: false }),
	(req, res) => {

	}
);

module.exports = router;
