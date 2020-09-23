module.exports = function initChat(io) {
	io.on("connection", (socket) => {
		socket.on("sendChat", (data) => {
			console.log(data);
			console.log(socket.rooms);
		});
	});
}