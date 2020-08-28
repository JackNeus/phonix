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

io.on('connection', (socket) => {
	socket.on('setUsername', (username) => {
		console.log("Setting username for session %s to %s.", socket.id, username);
		socket.username = username;
	});

	socket.on('makeGame', (ack) => {
		console.log("Making game...");
		
		var gameId = (Math.random()+1).toString(36).slice(2, 18);
     	console.log("Game Created by "+ socket.username + " w/ " + gameId);
		console.log(socket.id);

		ack(gameId);
	});
});