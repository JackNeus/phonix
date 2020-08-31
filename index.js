// Setup server
var express = require('express');
var app = express();
var fs = require('fs');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var path = require('path');
var port = process.env.PORT || 5000;

server.listen(port, function() {
	console.log('Server listening at port %d', port);
	fs.writeFile(__dirname + '/start.log', 'started', (error) => {});
});

// Routing
app.use("/assets", express.static(__dirname + "/assets"));
app.use(express.static(path.join(__dirname, "/client", "build")));

app.get('/*', (req, res) => {
	res.sendFile(path.join(__dirname, "client", "build", "index.html"));
})

var gameCollection = new function() {
	this.totalGameCount = 0;
	this.gameList = {};
}

const getHostedGame = function(uid) {
	for (var id in gameCollection.gameList) {
		if (gameCollection.gameList[id].host == uid) {
			return id;
		}
	}
	return undefined;
};

const TIMEOUT_GUESS = 45;
const TIMEOUT_VOTE = 30;
const TIMEOUT_RESULTS = 30;
const ROUND_COUNT = 3;

const POINTS_CORRECT_GUESS = 3;
const POINTS_CORRECT_VOTE = 1;
const POINTS_GOT_VOTE = 1;

const gameSounds = [
	{uri: "train.wav", answer: "train"},
	{uri: "bubbles.wav", answer: "bubbles blown through straw into water"},
	{uri: "can-stab.wav", answer: "tin cans being stabbed"},
	{uri: "cat-eating.ogg", answer: "cat eating"},
	{uri: "child-tickle.mp3", answer: "baby being tickled"},
	{uri: "frog-chirp.wav", answer: "frogs"},
	{uri: "rhino.wav", answer: "rhino"},
	{uri: "car-horn.wav", answer: "car alarm"}
]

const getSound = () => {
	return gameSounds[Math.floor(Math.random() * gameSounds.length)];
}

io.on('connection', (socket) => {
	socket.on('setUsername', (username) => {
		console.log("Setting username for session %s to %s.", socket.id, username);
		socket.uid = socket.id;
		socket.username = username;
	});

	// TODO: Remove setUsername as endpoint and add username as param
	socket.on('makeGame', (ack) => {
		console.log("Making game...");
		
		// Only allow user to create one game at a time.
		var existingGame = getHostedGame(socket.uid);
		if (existingGame) {
			console.log(`Game ${existingGame} already exists for ${socket.username} (${socket.uid}).`)
			ack(existingGame);
			return;
		}

		var gameId = (Math.random()+1).toString(36).slice(2, 18);
     	console.log("Game Created by "+ socket.username + " w/ " + gameId);

		gameCollection.gameList[gameId] = {
			host: socket.uid,
			open: true,
			players: {},
			round: 0,
		};
		gameCollection.totalGameCount++;

		ack(gameId);
	});

	socket.on('joinGame', (gameId) => {
		console.log(`${socket.username} (${socket.uid}) attempting to join ${gameId}`);
		let game = gameCollection.gameList[gameId];
		if (game == undefined) {
			console.log(`...but ${gameId} does not exist`);
			socket.emit("joinFailure", `${gameId} does not exist`);
		} else {
			console.log("...success!");
			game.players[socket.uid] = {
				uid: socket.uid,
				username: socket.username,
				score: 0
			};
			// Join lobby channel.
			socket.join(gameId);
			// Send client a success message.
			// TODO: Probably should just pass full game state in the future
			socket.emit("joinSuccess",
				{gameId: gameId,
				 isHost: socket.uid == game.host});
			sendPlayerUpdate(gameId);

			if (game.round > 0) { 
				// In case player joins in the middle of a game.
				socket.emit("gameStarted");
				// TODO: Maybe send game update?
			}
		}
	});

	var endGame = (gameId) => {
		io.to(gameId).emit('gameEnded');
		delete gameCollection.gameList[gameId];
	}

	var leaveGames = () => {
		let player = socket.uid;
		for (var gameId in gameCollection.gameList) {
			let game = gameCollection.gameList[gameId];
			if (game.players[socket.uid]) {
				console.log("Leaving game.");
				delete game.players[player];
				sendPlayerUpdate(gameId);
			}
		}
	}

	socket.on('disconnect', () => {
		console.log(`${socket.username} (${socket.uid}) disconnected.`);
		// When a client disconnects, end any games they are hosting (there should be at most one).
		for (var gameId in gameCollection.gameList) {
			if (gameCollection.gameList[gameId].host == socket.uid) {
				console.log(`Host left ${gameId}`);
				endGame(gameId);
			}
		}
		// When a client disconnects, leave any games they are in.
		leaveGames();
	});

	// TODO: .on("reconnect")?

	socket.on("leaveGame", () => {
		console.log(`${socket.username} (${socket.uid}) left game.`);
		leaveGames();
	})

	socket.on('endGame', (gameId) => {
		// Check to make sure user owns game.
		let game = gameCollection.gameList[gameId];
		if (game && game.host != socket.uid) return;

		console.log(`Host ended ${gameId}`);
		endGame(gameId);
	});

	var sendPlayerUpdate = (gameId) => {
		let game = gameCollection.gameList[gameId];
		// Broadcast new client joining to whole room.
		io.to(gameId).emit("playerUpdate", {players: game.players});
	}

	var guessesMatch = (a, b) => {
		return a === b;
	}

	var findWinners = (gameId) => {
		let game = gameCollection.gameList[gameId];
		if (!game || game.round < 1) return [];

		let maxScore = -1;
		for (let uid in game.players) {
			maxScore = Math.max(maxScore, game.players[uid].score);
		}
		let winners = [];
		for (let uid in game.players) {
			if (game.players[uid].score == maxScore) {
				winners.push(uid);
			}
		}
		return winners;
	}

	socket.on('startGame', (gameId) => {
		// Check to make sure user owns game.
		let game = gameCollection.gameList[gameId];
		if (!game || game && game.host != socket.uid) return;

		// Game is already in progress!
		if (game.round > 0) {
			console.log(`${gameId} has already been started.`);
			return;
		}
		io.to(gameId).emit("gameStarted");

		let sounds = ['apple', 'banana', 'pear'];

		var guessPhase = () => {
			game.phase = "GUESS";
			game.sound = getSound();
			// Prepopulate guesses with correct answer.
			game.guesses = [{
				uid: -1,
				username: "computer",
				guess: game.sound.answer,
				votes: 0,
				correct: true,
			}];
			io.to(gameId).emit("gameUpdate", {
				round: game.round,
				phase: game.phase,
				sound: game.sound.uri,
				time: TIMEOUT_GUESS,
			});

			// Wait for TIMEOUT_GUESS seconds and then advance game.
			setTimeout(() => {
				votePhase();
			}, TIMEOUT_GUESS * 1000);
		}
		var votePhase = () => {
			game.phase = "VOTE";
			io.to(gameId).emit("gameUpdate", {
				round: game.round,
				phase: game.phase,
				sound: game.sound.uri,
				guesses: game.guesses,
				time: TIMEOUT_VOTE,
			});

			// Wait for TIMEOUT_VOTE seconds and then advance game.
			setTimeout(() => {
				resultsPhase();
			}, TIMEOUT_VOTE * 1000);
		}
		var resultsPhase = () => {
			game.phase = "RESULTS";

			// Scoring logic!
			let correctAnswer = game.sound.answer;
			let guesses = game.guesses;
			for (let i = 0; i < guesses.length; i++) {
				if (guesses[i].uid == -1) continue;

				// Player's guess was straight up correct.
				if (guessesMatch(guesses[i].guess, correctAnswer)) {
					guesses[i].correct = true;
					game.players[guesses[i].uid].score += POINTS_CORRECT_GUESS;
				}
				// Player awarded points if other players vote for their guess.
				game.players[guesses[i].uid].score += guesses[i].votes * POINTS_GOT_VOTE;
			}

			for (let uid in game.players) {
				// Player voted for correct guess.
				if (guessesMatch(game.players[uid].vote, correctAnswer)) {
					game.players[uid].score += POINTS_CORRECT_VOTE;
				}
			}

			io.to(gameId).emit("gameUpdate", {
				round: game.round,
				phase: game.phase,
				sound: game.sound.uri,
				guesses: game.guesses,
				time: TIMEOUT_RESULTS
			});
			sendPlayerUpdate(gameId);

			// Wait for TIMEOUT_RESULTS seconds and then advance game.
			setTimeout(() => {
				// Reset round data.
				game.guesses = [];
				for (let uid in game.players) game.players[uid].vote = undefined;

				// Game is over.
				if (game.round == ROUND_COUNT) {
					// TODO: this whole bit is clunky and can be done client-side
					winners = findWinners(gameId);
					for (let i in winners) {
						game.players[winners[i]].winner = true;
					}
					sendPlayerUpdate(gameId);
					io.to(gameId).emit("gameFinished");

					// Reset game
					game.round = 0;
					for (let uid in game.players) {
						game.players[uid].winner = false;
						game.players[uid].score = 0;
					}
					return;
				}
				// Advance round.
				game.round++;
				guessPhase();
			}, TIMEOUT_RESULTS * 1000);
		}

		// Start game!
		game.round = 1;
		guessPhase();
	})

	socket.on('sendGuess', (data) => {
		console.log(`Received guess from ${socket.username}`);
		let gameId = data.gameId;
		let round = data.round;
		let guess = data.guess;

		let game = gameCollection.gameList[gameId];
		// Return if game does not exist or guess is invalid/late.
		if (!game || game.round < 0 || game.round != round || game.phase != "GUESS") return;
		
		// Add guess to game.
		game.guesses.push({
			uid: socket.uid,
			username: socket.username,
			guess: guess,
			votes: 0
		});
	})

	socket.on('sendVote', (data) => {
		console.log(`Received vote from ${socket.username}`);
		let gameId = data.gameId;
		let round = data.round;
		let vote = data.vote;

		let game = gameCollection.gameList[gameId];
		// Return if game does not exist or guess is invalid/late.
		if (!game || game.round < 0 || game.round != round || game.phase != "VOTE") return;
		
		// Get word that user guessed for.
		let voteWord = vote;
		game.players[socket.uid].vote = vote;

		// Add a vote to all guesses with that word (there could be multiple).
		for (let i = 0; i < game.guesses.length; i++) {
			if (game.guesses[i].guess === voteWord) {
				game.guesses[i].votes++;
				game.players[socket.uid].guess = game.guesses[i].guess;
			}
		}
	})
});