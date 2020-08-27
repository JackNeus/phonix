var $window = $(window);
var $createGame = $('.createGame');
var $joinGame = $('.joinGame');
var $usernameInput = $(".usernameInput");

var username;

var socket = io();

const setUsername = () => {
	// TODO: validation
	username = $usernameInput.val();
	socket.emit('setUsername', username);
}

const sendGame = () => {
	socket.emit('makeGame');
}

$createGame.click(() => {
	sendGame();
})

$usernameInput.blur(() => {
	setUsername();
})

setUsername();