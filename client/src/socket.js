import openSocket from "socket.io-client";

const socket = openSocket(process.env.REACT_APP_BASE_URL + ":" + process.env.PORT);
export default socket;