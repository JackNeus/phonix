// Setup server
var express = require('express');
const connectDB = require("./config/db");
var app = express();
var dotenv = require('dotenv').config();
var fs = require('fs');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');
var tsServer = require('timesync/server');
var cors = require('cors');
var passport = require("passport");
var bodyParser = require("body-parser");
const jsonParser = bodyParser.json();
const fileUpload = require("express-fileupload");

const users = require("./routes/users");
const admin = require("./routes/admin");
const Sound = require("./models/Sound");

var gameSounds;
const getSoundsFromDB = () => {
	Sound.find({}).then((data) => {
		console.log("(Re)loading sounds...");
		gameSounds = data;
	});
}
getSoundsFromDB();

var port = process.env.PORT || 5000;

var server = http.listen(port, function() {
	console.log('Server listening at port %d', port);
	fs.writeFile(__dirname + '/start.log', 'started', (error) => {});
});

connectDB();

app.use(cors());
app.use(fileUpload());
app.use(passport.initialize());
require("./config/passport")(passport);

// Routing
app.use("/", jsonParser, users);
app.use("/api", jsonParser, admin);
app.use("/assets", express.static(__dirname + "/assets"));
app.use(express.static(path.join(__dirname, "/client", "build")));
app.use("/timesync", tsServer.requestHandler);

app.post("/api/reload", 
	passport.authenticate("user-strategy", { session: false }),
	(req, res) => {
		getSoundsFromDB();
		res.status(200);
	}
);

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
	return gameId in gameCollection.gameList;
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

const guessesMatch = (guess, sound) => {
	let u = (w) => {
		if (w === undefined)
			return "";
		return w.toString().toLowerCase().replace(/\s+/g, '');
	}
	guess = u(guess);

	// Sound is a simple string.
	if (typeof sound === "string") {
		return guess === u(sound);
	}
	// Sound is an object with answer and accept props.
	let answer = u(sound.answer);
	if (guess === answer) return true;
	for (let i in sound.accept) {
		if (guess === u(sound.accept[i])) return true;
	}
	return false;
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
				playerCount: getActivePlayerCount(gameId),
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
		} else if (socket.username === undefined) {
			console.log(`...but username is undefined`);
			socket.emit("joinFailure", `username is undefined`);
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
				 host: game.host});
			sendPlayerUpdate(gameId);

			if (game.round > 0) { 
				// In case player joins in the middle of a game.
				socket.emit("gameStarted");
				sendGameUpdate(gameId, true);
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

	var assignNewHost = (gameId) => {
		let game = gameCollection.gameList[gameId];
		let newHost = getActivePlayer(gameId);
		if (newHost == -1) {
			console.log(`Could not find new host for ${gameId}. Ending.`);
			endGame(gameId);
			return;
		} else {
			console.log(`Found new host for ${gameId}: ${newHost}`);
			game.host = newHost;
			game.hostUsername = game.players[newHost].username;
		}
	}

	// TODO: None of this stuff should be plural. Enforce game limit more explicitly
	var leaveGames = () => {
		let player = socket.uid;
		for (var gameId in gameCollection.gameList) {
			let game = gameCollection.gameList[gameId];

			if (game.players[socket.uid]) {
				console.log(`${player} leaving game ${gameId}.`);
				delete game.players[player];
				socket.leave(gameId);

				// Player is host and tried to leave game.
				if (game.host == player) {
					assignNewHost(gameId);
				}
				sendPlayerUpdate(gameId);
			}
		}
		sendGamesList();
	}

	var getActivePlayerCount = (gameId) => {
		let game = gameCollection.gameList[gameId];
		let count = 0;
		for (let id in game.players) {
			if (!game.players[id].disconnected) count++;
		}
		return count;
	}

	var getActivePlayer = (gameId) => {
		let game = gameCollection.gameList[gameId];
		for (let id in game.players) {
			if (!game.players[id].disconnected) {
				return id;
			}
		}
		return -1;
	}

	socket.on('disconnect', () => {
		console.log(`${socket.username} (${socket.uid}) disconnected.`);
		
		// When a client disconnects, end any games they are hosting (there should be at most one).
		for (var gameId in gameCollection.gameList) {
			let game = gameCollection.gameList[gameId];
			if (!(socket.uid in game.players)) continue;

			game.players[socket.uid].disconnected = true;
			if (gameCollection.gameList[gameId].host == socket.uid) {
				assignNewHost(gameId);
			}
			if (gameExists(gameId))	sendPlayerUpdate(gameId);
		}
	});

	socket.on("reconnect", () => {
		for (var gameId in gameCollection.gameList) {
			let game = gameCollection.gameList[gameId];
			if (!(socket.uid in game.players)) continue;

			game.players[socket.uid].disconnected = false;
			sendPlayerUpdate(gameId);
			sendGameUpdate(gameId, true);
		}
	});

	/* Currently disabled.
	socket.on("reconnect_failed", () => {
		console.log(`${socket.username} (${socket.uid}) failed to reconnect.`);
		leaveGames();
	})
	*/

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
		io.to(gameId).emit("playerUpdate", {
			host: game.host,
			players: game.players
		});
	}

	var sendGameUpdate = (gameId, singleton) => {
		let game = gameCollection.gameList[gameId];
		let update = {
			gameId: gameId,
			round: game.round,
			phase: game.phase,
			sound: game.sound.filename,
			timeoutStart: game.timeoutStart,
			timeoutEnd: game.timeoutEnd,
		};
		if (game.phase !== "GUESS") {
			update.guesses = game.guesses;
		}
		if (!singleton) {
			io.to(gameId).emit("gameUpdate", update);
		} else {
			socket.emit("gameUpdate", update);
		}
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

			// Wait for TIMEOUT_GUESS seconds and then advance game.
			let timeoutId = setTimeout(votePhase, calculateTimeout(game.timeoutEnd));

			game.guessHandler = () => {
				if (game.guesses.length == getActivePlayerCount(gameId) + 1) {
					clearTimeout(timeoutId);
					// Everyone has guessed! Progress to vote phase.
					votePhase();
				}
			}
		}
		var votePhase = () => {
			// If game ended or was deleted for some other reason, stop sending
			// game updates.
			if (!gameExists(gameId)) return;

			game.phase = "VOTE";
			game.timeoutStart = tsNow();
			game.timeoutEnd = game.timeoutStart + TIMEOUT_VOTE * 1000;
			sendGameUpdate(gameId);

			// Wait for TIMEOUT_VOTE seconds and then advance game.
			let timeoutId = setTimeout(resultsPhase, calculateTimeout(game.timeoutEnd));

			game.voteHandler = () => {
				if (++game.votes == getActivePlayerCount(gameId)) {
					clearTimeout(timeoutId);
					// Everyone has voted! Progress to results phase.
					resultsPhase();
				}
			}
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

			game.timeoutStart = tsNow();
			game.timeoutEnd = game.timeoutStart + TIMEOUT_RESULTS * 1000;
			sendGameUpdate(gameId);
			sendPlayerUpdate(gameId);

			// Wait for TIMEOUT_RESULTS seconds and then advance game.
			let timeoutId = setTimeout(nextRound, calculateTimeout(game.timeoutEnd));

			game.skips = 0;
			game.skipHandler = () => {
				if (game.round == ROUND_COUNT) return;
				if (++game.skips == getActivePlayerCount()) {
					clearTimeout(timeoutId);
					nextRound();
				}
			}

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
		
		// Don't allow players to submit multiple guesses.
		for (let i in game.guesses) {
			if (game.guesses[i].uid === socket.uid) return;
		}

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

		// Player already voted this round.
		if (game.players[socket.uid].vote !== undefined) return;

		// Get word that user guessed for.
		let voteWord = vote;
		game.players[socket.uid].vote = vote;

		// Add a vote to all guesses with that word (there could be multiple).
		for (let i = 0; i < game.guesses.length; i++) {
			if (guessesMatch(game.guesses[i].guess, voteWord)) {
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