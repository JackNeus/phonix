import React, { Component } from 'react';
import {Container, Row, Col, Button} from 'react-bootstrap';
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

	closeLobby() {
		socket.emit("endGame", this.state.gameId);
		this.exitLobby();
	}

	exitLobby() {
		this.props.history.push("/");
	}

    render() {
    	let joinLink = `http://localhost:3000/${this.state.gameId}`;
        return (
	        <Container>
	        	<Row className="justify-content-center">
			      <Col className="pane lobby-info" md="10">
			      	Lobby: {this.state.gameId}&nbsp;
			      	{this.state.isHost &&
			      		<span>(Join link: <a target="_blank" href={joinLink}>{joinLink}</a>)</span>
			      	}
			      </Col>
			      <Col className="">
					<Button onClick={this.closeLobby}>Close Lobby</Button>
			      </Col>
				</Row>
				<Row>
					<Col className="pane" md="3">
					{Object.keys(this.state.players).map((id) => {
						return (<span key={id}>{this.state.players[id].username}<br /></span>)
					})}
					</Col>
					<Col className="pane light game-area">
						GAME AREA
					</Col>
				</Row>
			</Container>
        )
    }
}

export default Lobby;