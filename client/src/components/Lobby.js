import React, { Component } from 'react';
import socket from '../socket';

class Lobby extends Component {
	constructor(props) {
		super();
		this.state = {gameId: props.gameId};
		this.closeLobby = this.closeLobby.bind(this);
		this.exitLobby = this.exitLobby.bind(this);
	}

	componentDidMount() {
		socket.emit("joinGame", this.state.gameId);

		socket.on("joinSuccess", (data) => {
			this.setState({isHost: data.isHost});
		})

		socket.on("joinFailure", (err) => {
			console.log(err);
			this.exitLobby();
		})

		socket.on("gameEnded", () => {
			console.log("Game was ended by host.");
			this.exitLobby();
		})
	}

	closeLobby() {
		socket.emit("endGame", this.state.gameId);
	}

	exitLobby() {
		this.props.history.push("/");
	}

    render() {
        return (
        	<div>
		      <p>Lobby: {this.state.gameId}</p>
		      {this.state.isHost &&
		      	<button onClick={this.closeLobby}>Close Lobby</button>}
			</div>
        )
    }
}

export default Lobby;