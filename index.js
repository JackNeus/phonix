// Setup server
var express = require('express');
var app = express();
var fs = require('fs');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 5000;

server.listen(port, function() {
	console.log('Server listening at port %d', port);
	fs.writeFile(__dirname + '/start.log', 'started', (error) => {});
});

// Routing
app.use(express.static(__dirname));

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

const TIMEOUT_GUESS = 5 * 1000;

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
			round: -1,
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
			game.players[socket.uid] = {username: socket.username};
			// Join lobby channel.
			socket.join(gameId);
			// Send client a success message.
			// TODO: Probably should just pass full game state in the future
			socket.emit("joinSuccess",
				{gameId: gameId,
				 isHost: socket.uid == game.host});
			sendPlayerUpdate(gameId);
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

	socket.on('startGame', (gameId) => {
		// Check to make sure user owns game.
		let game = gameCollection.gameList[gameId];
		if (!game || game && game.host != socket.uid) return;

		// Game is already in progress!
		if (game.round != -1) {
			console.log(`${gameId} has already been started.`);
			return;
		}

		game.round = 0;
		game.phase = "GUESS";
		game.guesses = [];

		let sounds = ['apple', 'banana', 'pear'];

		io.to(gameId).emit("gameUpdate", {
			round: game.round,
			phase: game.phase,
			sound: sounds[game.round]
		})
		// Wait for TIMEOUT_GUESS seconds and then advance game.
		setTimeout(() => {
			game.phase = "VOTE";
			io.to(gameId).emit("gameUpdate", {
				round: game.round,
				phase: game.phase,
				sound: sounds[game.round],
				guesses: game.guesses
			});
		}, TIMEOUT_GUESS);
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
			guess: guess
		});
	})
});