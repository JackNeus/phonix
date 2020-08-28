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

const getHostedGame = function(username) {
	for (var id in gameCollection.gameList) {
		if (gameCollection.gameList[id].host == username) {
			return id;
		}
	}
	return undefined;
};

io.on('connection', (socket) => {
	socket.on('setUsername', (username) => {
		console.log("Setting username for session %s to %s.", socket.id, username);
		socket.username = username;
	});

	// TODO: Remove setUsername as endpoint and add username as param
	socket.on('makeGame', (ack) => {
		console.log("Making game...");
		
		// Only allow user to create one game at a time.
		var existingGame = getHostedGame(socket.username);
		if (existingGame) {
			console.log(`Game ${existingGame} already exists for ${socket.username}.`)
			ack(existingGame);
			return;
		}

		var gameId = (Math.random()+1).toString(36).slice(2, 18);
     	console.log("Game Created by "+ socket.username + " w/ " + gameId);
		console.log(socket.id);

		console.log(gameCollection.gameList);
		gameCollection.gameList[gameId] = {
			// TODO: Allow for duplicate usernames (currently used as uid)
			host: socket.username,
			open: true,
			players: new Set()
		};
		gameCollection.totalGameCount++;

		ack(gameId);
	});

	var endGame = (gameId) => {
		io.to(gameId).emit('gameEnded');
		delete gameCollection.gameList[gameId];
	}

	socket.on('disconnect', () => {
		// When a client disconnects, end any games they are hosting (there should be at most one).
		for (var gameId in gameCollection.gameList) {
			if (gameCollection.gameList[gameId].host == socket.username) {
				console.log(`Host left ${gameId}`);
				endGame(gameId);
			}
		}
	});

	socket.on('endGame', (gameId) => {
		// Check to make sure user owns game.
		let game = gameCollection.gameList[gameId];
		if (!game || game.host != socket.username) return;

		console.log(`Host ended ${gameId}`);
		endGame(gameId);
	});

	socket.on('joinGame', (gameId) => {
		console.log(`${socket.id} attempting to join ${gameId}`);
		console.log(gameCollection);
		let game = gameCollection.gameList[gameId];
		if (game == undefined) {
			console.log(`...but ${gameId} does not exist`);
			socket.emit("joinFailure", `${gameId} does not exist`);
		} else {
			console.log("success!");
			game.players.add({username: socket.username});
			// Join lobby channel.
			socket.join(gameId);
			// Send client a success message.
			let playerList = Array.from(game.players);
			// TODO: Probably should just pass full game state in the future
			socket.emit("joinSuccess",
				{isHost: socket.username == game.host, players: playerList});
			// Broadcast new client joining to whole room.
			socket.to(gameId).emit("playerUpdate", {players: playerList});
		}
	});
});