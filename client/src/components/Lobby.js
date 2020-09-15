import React, { Component } from 'react';
import { Container, Row, Col, Button,
	OverlayTrigger, Tooltip } from 'react-bootstrap';
import socket from '../socket';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons';
import CopyToClipboard from 'react-copy-to-clipboard';

import Game from "./Game";

class Lobby extends Component {
	constructor(props) {
		super();
		this.state = {
			gameId: props.gameId,
			players: [],
			gameStarted: false,
			gamePlayed: false
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

		const markWinners = () => {
			let players = this.state.players;
			let i = 0, winningScore = players[0].score;
			while (i < players.length && players[i].score === winningScore) {
				players[i].winner = true;
				i++;
			}
			this.setState({players: players});
		}

		socket.on("playerUpdate", (data) => {
			let players = Object.values(data.players);
			players.sort((a, b) => a.score < b.score ? 1 : -1);

			this.setState({players: players});
			if (this.state.gamePlayed && !this.state.gameStarted) markWinners();
		})

		socket.on("gameStarted", () => {
			this.setState({
				gameStarted: true,
				gamePlayed: true
			});
		})

		socket.on("gameEnded", () => {
			console.log("Game was ended by host.");
			this.exitLobby();
		})

		socket.on("gameFinished", () => {
			console.log("Game finished.");
			this.setState({gameStarted: false});
			markWinners();
		})
	}

	componentWillUnmount() {
		socket.emit("leaveGame");
		socket.off("joinSuccess");
		socket.off("joinFailure");
		socket.off("playerUpdate");
		socket.off("gameStarted");
		socket.off("gameEnded");
		socket.off("gameFinished");
	}

	exitLobby() {
		if (this.state.isHost) socket.emit("endGame", this.state.gameId);
		this.props.history.push("/");
	}

	startGame() {
		this.setState({
			gameStarted: true,
			gamePlayed: true
		});
		socket.emit("startGame", this.state.gameId);
	}

    render() {
    	let leaveAction;
   		if (this.state.gameStarted) {
    		leaveAction = this.state.isHost ? "End Game" : "Leave Game";
    	} else {
    		leaveAction = this.state.isHost ? "Close Lobby" : "Exit Lobby";
    	}
    	let startAction = this.state.gamePlayed ? "New Game" : "Start Game";

		let joinLink = `${process.env.REACT_APP_CLIENT_URL}/${this.state.gameId}`;
		let joinLinkComponent = (
			<OverlayTrigger
				key='join-link'
				placement='bottom'
				overlay={<Tooltip>Click to copy to the clipboard!</Tooltip>}>
				<CopyToClipboard text={joinLink}>
					<span>Join link: <span className="link">{joinLink}</span></span>
				</CopyToClipboard>
			</OverlayTrigger>);

        return (
	        <Container>
	        	<Row className="page-elt justify-content-center">
			      <Col className="pane lobby-info">
			      	<span className="align-middle">
			      	Lobby: {this.state.gameId}&nbsp;
			      	<br />
			      	{this.state.isHost && joinLinkComponent}
			      	</span>
			      </Col>
			      <Col className="action-buttons" xs={12} sm="auto">
			      	<Container>
			      		<Row className="justify-content-sm-end justify-content-around">
				      		<Col className="action-button" xs="auto">
				      			<Button onClick={this.exitLobby}>{leaveAction}</Button>
				      		</Col>
				      		{this.state.isHost && !this.state.gameStarted &&
				      		<Col className="action-button" xs="auto">
				      			<Button onClick={this.startGame}>{startAction}</Button>
				      		</Col>}
			      		</Row>
			      	</Container>
			      </Col>
				</Row>
				<Row className="page-elt">
					<Col className="pane player-pane" md="3">
						<Container>
						{this.state.players.map((player) => {
							return (
								<div key={player.uid} className={`player-info  ${player.winner ? "winner" : ""}`}>
									{player.username}
									{this.state.gamePlayed &&
									<div className="player-score float-right">
										{player.score}
									</div>}
								</div>
							)
						})}
						</Container>
					</Col>
					<Col className="pane light game-area">
						{this.state.gameStarted &&
							<Game gameId={this.state.gameId}/>}
						<div className="help-icon">
							<OverlayTrigger
								key='help'
								placement='top'
								overlay={
									<Tooltip>
										Hello!<br />
										A round in Phonix consists of three phases:<br />
										1. <strong>Identify</strong>. A sound will be played.
										Submit your guess for what it is!<br />
										2. <strong>Vote</strong>. The correct answer has been
										shuffled in with players' guesses. Vote for what you think
										is correct (or funniest)!<br />
										3. <strong>Scoring</strong>. Receive <strong>+3</strong> points
										for guessing the sound correctly. Receive <strong>+1</strong> points
										for voting for the correct answer. And 
										receive <strong>+1</strong> points for each 
										player who votes for your guess!
									</Tooltip>
								}
							>
								<FontAwesomeIcon icon={faQuestionCircle}/>
							</OverlayTrigger>
						</div>
					</Col>
				</Row>
			</Container>
        )
    }
}

export default Lobby;