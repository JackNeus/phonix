import React, { Component } from 'react';
import socket from '../socket';

class Lobby extends Component {
	constructor(props) {
		super();
		this.state = {gameId: props.gameId, players: []};
		this.closeLobby = this.closeLobby.bind(this);
		this.exitLobby = this.exitLobby.bind(this);
	}

	componentDidMount() {
		socket.emit("joinGame", this.state.gameId);

		socket.on("joinSuccess", (data) => {
			console.log(data.gameId);
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

		socket.on("playerUpdate", (data) => {
			this.setState({players: data.players});
		})
	}

	componentWillUnmount() {
		socket.off("joinSuccess");
		socket.off("playerUpdate");
	}

	closeLobby() {
		socket.emit("endGame", this.state.gameId);
	}

	exitLobby() {
		this.props.history.push("/");
	}

    render() {
    	let joinLink = `http://localhost:3000/${this.state.gameId}`;
        return (
	        <div>
	        	<div>
			      <p>Lobby: {this.state.gameId}</p>
			      {this.state.isHost &&
			      	<React.Fragment>
			      		<p>Join link: <a href={joinLink}>{joinLink}</a></p>
			      		<button onClick={this.closeLobby}>Close Lobby</button>
			      	</React.Fragment>
			      }
				</div>
				<p>
				{Object.keys(this.state.players).map((id) => {
					return (<span key={id}>{this.state.players[id].username}<br /></span>)
				})}
				</p>
			</div>
        )
    }
}

export default Lobby;