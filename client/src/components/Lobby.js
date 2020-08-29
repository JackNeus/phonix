import React, { Component } from 'react';
import {Container, Row, Col, Button} from 'react-bootstrap';
import socket from '../socket';

import Game from "./Game";

class Lobby extends Component {
	constructor(props) {
		super();
		this.state = {
			gameId: props.gameId,
			players: [],
			gameStarted: false
		};
		this.exitLobby = this.exitLobby.bind(this);
		this.startGame = this.startGame.bind(this);
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

		socket.on("playerUpdate", (data) => {
			this.setState({players: data.players});
		})
	}

	componentWillUnmount() {
		socket.emit("leaveGame");
		socket.off("joinSuccess");
		socket.off("playerUpdate");
	}

	exitLobby() {
		if (this.state.isHost) socket.emit("endGame", this.state.gameId);
		this.props.history.push("/");
	}

	startGame() {
		this.setState({
			gameStarted: true
		});
		socket.emit("startGame", this.state.gameId);
	}

    render() {
    	let leaveAction;
    	if (this.state.gameStarted) {
    		leaveAction = "End Game";
    	} else {
    		leaveAction = this.state.isHost ? "Close Lobby" : "Exit Lobby";
    	}
    	let joinLink = `http://localhost:3000/${this.state.gameId}`;
        return (
	        <Container>
	        	<Row className="page-elt justify-content-center">
			      <Col className="pane lobby-info" md="10">
			      	<span className="align-middle">
			      	Lobby: {this.state.gameId}&nbsp;
			      	<br />
			      	{this.state.isHost &&
			      	<span>
			      		(Join link: <a target="_blank" rel="noopener noreferrer" href={joinLink}>{joinLink}</a>)
			      	</span>
			      	}
			      	</span>
			      </Col>
			      <Col className="action-buttons">
			      	<Container>
			      		<Row>
			      			<Button onClick={this.exitLobby}>{leaveAction}</Button>
			      		</Row>
			      		{this.state.isHost && !this.state.gameStarted &&
			      		<Row><Button onClick={this.startGame}>Start Game</Button></Row>}
			      	</Container>
			      </Col>
				</Row>
				<Row className="page-elt">
					<Col className="pane" md="3">
					{Object.keys(this.state.players).map((id) => {
						return (<span key={id}>{this.state.players[id].username}<br /></span>)
					})}
					</Col>
					<Col className="pane light game-area">
						{this.state.gameStarted && <Game gameId={this.state.gameId}/>}
					</Col>
				</Row>
			</Container>
        )
    }
}

export default Lobby;