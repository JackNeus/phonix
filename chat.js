module.exports = function initChat(io) {
	io.on("connection", (socket) => {
		socket.on("sendMessage", (data) => {
			// Stamp message with server time.
			data.time = new Date().getTime();
			for (let i in socket.rooms) {
				if (i === socket.id) continue;
				io.to(socket.rooms[i]).emit("chatMessage", data);
			}
		});
	});
}