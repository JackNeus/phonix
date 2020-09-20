var rewire = require("rewire");
var chai = require("chai");
var should = chai.should();

var app = rewire("./index.js");

var guessesMatch = app.__get__("guessesMatch");

describe("index.js", () => {

	it("guessesMatch undefined", (done) => {
		// Undefined guess
		guessesMatch(undefined, "sound").should.equal(false);
		done();
	});

	it("guessesMatch string", (done) => {
		guessesMatch("hello", "hello").should.equal(true);
		guessesMatch("hello", "\tHeLLo   ").should.equal(true);
		guessesMatch("hello", "goodbye").should.equal(false);
		done();
	});

	it("guessesMatch object", (done) => {
		let sound = {
			answer: "car horn",
			accept: ["car", "car alarm"]
		};
		guessesMatch("Car Horn", sound).should.equal(true);
		guessesMatch("   Car ", sound).should.equal(true);
		guessesMatch("Car    alarm", sound).should.equal(true);

		done();
	})
})