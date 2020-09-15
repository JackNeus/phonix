// Setup server
var express = require('express');
var app = express();
var dotenv = require('dotenv').config();
var fs = require('fs');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');
var tsServer = require('timesync/server');
var cors = require('cors');
var port = process.env.PORT || 5000;

var server = http.listen(port, function() {
	console.log('Server listening at port %d', port);
	fs.writeFile(__dirname + '/start.log', 'started', (error) => {});
});

// Routing
app.use("/assets", express.static(__dirname + "/assets"));
app.use(express.static(path.join(__dirname, "/client", "build")));
app.use("/timesync", cors(), tsServer.requestHandler);

app.get('/*', (req, res) => {
	res.sendFile(path.join(__dirname, "client", "build", "index.html"));
})

var gameCollection = new function() {
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

const gameExists = (gameId) => {
	return gameCollection.gameList[gameId] !== undefined;
}

const tsNow = () => {
	return new Date().getTime();
}

const calculateTimeout = (endTime) => {
	return endTime - tsNow();
}

const TIMEOUT_GUESS = process.env.TIMEOUT_GUESS || 45;
const TIMEOUT_VOTE = process.env.TIMEOUT_VOTE || 30;
const TIMEOUT_RESULTS = process.env.TIMEOUT_RESULTS || 15;
const ROUND_COUNT = process.env.ROUND_COUNT || 3;

const POINTS_CORRECT_GUESS = 3;
const POINTS_CORRECT_VOTE = 1;
const POINTS_GOT_VOTE = 1;

const gameSounds = [
	{uri: "train.wav", answer: "train"},
	{uri: "bubbles.wav", answer: "bubbles"},
	{uri: "can-stab.wav", answer: "tin cans"},
	{uri: "cat-eating.ogg", answer: "cat eating"},
	{uri: "child-tickle.mp3", answer: "laughing baby"},
	{uri: "frog-chirp.wav", answer: "frogs"},
	{uri: "rhino.wav", answer: "rhino"},
	{uri: "car-horn.wav", answer: "car alarm"},
	{uri: "ocean.wav", answer: "ocean"},
	{uri: "elevator.wav", answer: "elevator"},
	{uri: "subway.wav", answer: "subway"},
	{uri: "alligator.mp3", answer: "baby allligator"},
	{uri: "monkey.wav", answer: "monkey"},
	//{uri: "pancake-batter.wav", answer: "pancake batter"},
	{uri: "microwave.wav", answer: "microwave"},
	{uri: "motorcycle.wav", answer: "motorcycle"},
	{uri: "concrete-mixer.wav", answer: "concrete mixer"},
	{uri: "keyboard.mp3", answer: "typing", accept: ["keyboard"]},
	{uri: "cricket.m4a", answer: "crickets"},
]

const getSound = (game) => {
	// If we've run out of sounds, reset used dictionary.
	if (game.usedSounds.size == gameSounds.length) {
		game.usedSounds = new Set();
	}

	var sound;
	do {
		sound = gameSounds[Math.floor(Math.random() * gameSounds.length)];
	} while (game.usedSounds.has(sound));
	game.usedSounds.add(sound);
	return sound;
}

io.on('connection', (socket) => {
	console.log("Received connection from ", socket.id);

	const getGamesList = (requests) => {
		let games = gameCollection.gameList;
		let gameList = Object.keys(games).map((gameId) => {
			let game = games[gameId];
			return {
				id: gameId,
				host: game.hostUsername,
				playerCount: Object.keys(game.players).length,
				started: game.started
			};
		}).filter((game) => {
			return games[game.id].public || requests && requests.indexOf(game.id) != -1;
		});

		return gameList;
	}
	const sendGamesList = () => {
		io.emit("gameList", getGamesList());
	}
	// games: Specific requests, including private games.
	socket.on("getGameList", (games) => {
		socket.emit("gameList", getGamesList(games));
	})

	socket.on('setUsername', (username) => {
		console.log("Setting username for session %s to %s.", socket.id, username);
		socket.uid = socket.id;
		socket.username = username;
	});

	// TODO: Remove setUsername as endpoint and add username as param
	socket.on('makeGame', (data, ack) => {
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
			hostUsername: socket.username,
			started: false,
			public: data.public,
			players: {},
			round: 0,
			usedSounds: new Set()
		};
		gameCollection.gameList[gameId].players[socket.uid] = {
			uid: socket.uid,
			username: socket.username,
			score: 0
		};

		ack(gameId);
		sendGamesList();
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
			socket.emit("joinSuccess",
				{gameId: gameId,
				 isHost: socket.uid == game.host});
			sendPlayerUpdate(gameId);

			if (game.round > 0) { 
				// In case player joins in the middle of a game.
				socket.emit("gameStarted");
				sendGameUpdate(gameId);
			}
		}
		sendGamesList();
	});

	var endGame = (gameId) => {
		io.to(gameId).emit('gameEnded');
		delete gameCollection.gameList[gameId];
		socket.leave(gameId);
		sendGamesList();
	}

	var leaveGames = () => {
		let player = socket.uid;
		for (var gameId in gameCollection.gameList) {
			let game = gameCollection.gameList[gameId];
			if (game.players[socket.uid]) {
				console.log("Leaving game.");
				delete game.players[player];
				socket.leave(gameId);
				sendPlayerUpdate(gameId);
			}
		}
		sendGamesList();
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

	var sendGameUpdate = (gameId) => {
		let game = gameCollection.gameList[gameId];
		let update = {
			gameId: gameId,
			round: game.round,
			phase: game.phase,
			sound: game.sound.uri,
			timeoutStart: game.timeoutStart,
			timeoutEnd: game.timeoutEnd,
		};
		if (game.phase !== "GUESS") {
			update.guesses = game.guesses;
		}
		io.to(gameId).emit("gameUpdate", update);
	}

	var guessesMatch = (guess, sound) => {
		if (guess === sound.answer) return true;
		for (let i in sound.accept) {
			if (guess === sound.accept[i]) return true;
		}
		return false;
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
		game.started = true;
		io.to(gameId).emit("gameStarted");
		sendGamesList();

		let sounds = ['apple', 'banana', 'pear'];

		sendPlayerUpdate(gameId);
		var guessPhase = () => {
			// If game ended or was deleted for some other reason, stop sending
			// game updates.
			if (!gameExists(gameId)) return;

			game.phase = "GUESS";
			game.sound = getSound(game);
			game.votes = 0;
			// Prepopulate guesses with correct answer.
			game.guesses = [{
				uid: -1,
				username: "computer",
				guess: game.sound.answer,
				votes: 0,
				correct: true,
			}];
			game.timeoutStart = tsNow();
			game.timeoutEnd = game.timeoutStart + TIMEOUT_GUESS * 1000;
			sendGameUpdate(gameId);

			game.guessHandler = () => {
				let playerCount = Object.keys(game.players).length;
				if (game.guesses.length == playerCount + 1) {
					// Everyone has guessed! Progress to vote phase.
					votePhase();
				}
			}

			// Wait for TIMEOUT_GUESS seconds and then advance game.
			setTimeout(() => {
				if (game.phase === "GUESS") {
					votePhase();
				}
			}, calculateTimeout(game.timeoutEnd));
		}
		var votePhase = () => {
			// If game ended or was deleted for some other reason, stop sending
			// game updates.
			if (!gameExists(gameId)) return;

			game.phase = "VOTE";
			game.timeoutStart = tsNow();
			game.timeoutEnd = game.timeoutStart + TIMEOUT_VOTE * 1000;
			sendGameUpdate(gameId);

			game.voteHandler = () => {
				if (++game.votes == Object.keys(game.players).length) {
					// Everyone has voted! Progress to results phase.
					resultsPhase();
				}
			}

			// Wait for TIMEOUT_VOTE seconds and then advance game.
			setTimeout(() => {
				if (game.phase == "VOTE") {
					resultsPhase();
				}
			}, calculateTimeout(game.timeoutEnd));
		}
		var resultsPhase = () => {
			// If game ended or was deleted for some other reason, stop sending
			// game updates.
			if (!gameExists(gameId)) return;
			game.phase = "RESULTS";

			// Scoring logic!
			let guesses = game.guesses;
			for (let i = 0; i < guesses.length; i++) {
				if (guesses[i].uid == -1) continue;

				// Player's guess was straight up correct.
				if (guessesMatch(guesses[i].guess, game.sound)) {
					guesses[i].correct = true;
					game.players[guesses[i].uid].score += POINTS_CORRECT_GUESS;
				}
				// Player awarded points if other players vote for their guess.
				game.players[guesses[i].uid].score += guesses[i].votes * POINTS_GOT_VOTE;
			}

			for (let uid in game.players) {
				// Player voted for correct guess.
				if (guessesMatch(game.players[uid].vote, game.sound)) {
					game.players[uid].score += POINTS_CORRECT_VOTE;
				}
			}

			const nextRound = () => {
				// If game ended or was deleted for some other reason, stop sending
				// game updates.
				if (!gameExists(gameId)) return;

				// Reset round data.
				game.guesses = [];
				game.votes = 0;
				for (let uid in game.players) game.players[uid].vote = undefined;

				// Game is over.
				if (game.round == ROUND_COUNT) {
					sendPlayerUpdate(gameId);
					io.to(gameId).emit("gameFinished");

					// Reset game
					game.started = false;
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
			}

			game.skips = 0;
			game.skipHandler = () => {
				if (game.round == ROUND_COUNT) return;
				if (++game.skips == Object.keys(game.players).length) {
					nextRound();
				}
			}

			game.timeoutStart = tsNow();
			game.timeoutEnd = game.timeoutStart + TIMEOUT_RESULTS * 1000;
			sendGameUpdate(gameId);
			sendPlayerUpdate(gameId);

			// Wait for TIMEOUT_RESULTS seconds and then advance game.
			setTimeout(() => {
				if (game.phase === "RESULTS") {
					nextRound();
				}
			}, calculateTimeout(game.timeoutEnd));
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
		game.guessHandler();
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
		game.voteHandler();
	})

	socket.on('skipResults', (data) => {
		console.log(`Received skip from ${socket.username}`);
		let gameId = data.gameId;
		let round = data.round;

		let game = gameCollection.gameList[gameId];
		// Return if game does not exist or guess is invalid/late.
		if (!game || game.round < 0 || game.round != round || game.phase != "RESULTS") return;

		game.skipHandler();
	})
});