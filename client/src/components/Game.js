import React, { Component } from 'react';
import {Container, Row, Col, Table} from 'react-bootstrap';
import ReactAudioPlayer from 'react-audio-player';
import { CountdownCircleTimer } from 'react-countdown-circle-timer';
import socket from '../socket';

const BASE_URL = `${process.env.REACT_APP_SERVER_URL}/assets/`;

class Game extends Component {
	constructor(props) {
		super(props);
		this.state = {
			gameId: props.gameId,
			round: -1,
			guess: false,
		};
		this.handleSubmitGuess = this.handleSubmitGuess.bind(this);
		this.handleSendVote = this.handleSendVote.bind(this);
	}

	componentDidMount() {
		socket.on("gameUpdate", (data) => {
			this.setState({
				round: data.round,
				phase: data.phase,
				sound: data.sound,
				time: data.time,
				guesses: data.guesses
			});
			if (data.phase === "GUESS") {
				this.setState({
					guess: false,
					vote: null,
				});
			}
		})
	}

	componentWillUnmount() {
		socket.off("gameUpdate");
	}

	handleSubmitGuess(e) {
		if (e.keyCode === 13) { // Enter
			socket.emit("sendGuess", {
				gameId: this.state.gameId,
				round: this.state.round,
				guess: e.target.value
			})
			this.setState({guess: e.target.value});
		}
	}

	handleSendVote(guess) {
		console.log("Vote attempted.");
		// It is not time to vote or user already voted.
		if (this.state.phase !== "VOTE" || this.state.vote) return;
		console.log("Voted for ", guess);
		this.setState({vote: guess.uid});
		socket.emit("sendVote", {
			gameId: this.state.gameId,
			round: this.state.round,
			vote: guess.guess
		});
	}

	render() {
		let gamePane;

		let inGuessPhase = this.state.phase === "GUESS";
		let inVotePhase = this.state.phase === "VOTE";
		let inResultsPhase = this.state.phase === "RESULTS";
		if (inGuessPhase) {
			gamePane = (
			<div>
				Your guess: <input type="text" 
					disabled={this.state.guess !== false}
					onKeyDown={this.handleSubmitGuess} />
			</div>);
		} else if (inVotePhase || inResultsPhase) {
			gamePane = (
			<Table striped hover={inVotePhase} className="vote-table">
				<tbody>
					{this.state.guesses.map((guess)	=> {
						let voteCount = (<span className="vote-count">{guess.votes}</span>)
						let classes = "";
						if (this.state.vote === guess.uid) classes = classes + "voted ";
						if (inResultsPhase && guess.correct) classes = classes + "correct-guess";
						
						return (<tr key={guess.uid}>
							<td value={guess.uid}
								className={classes}
								onClick={() => {this.handleSendVote(guess)}}>
								{guess.guess}
								{inResultsPhase && voteCount}
							</td>
						</tr>);
					})}
				</tbody>
			</Table>
			)
		}

		return (
			<Container>
				<Row className="game-info">
					<Col>Round: {this.state.round}</Col>
					{this.state.time > 0 &&
					<Col>
						<div className="timer">
						<CountdownCircleTimer
							key={this.state.phase}
							isPlaying
							size={35}
							strokeWidth={5}
							strokeCap="square"
							colors={[["#3498db"]]}
							duration={this.state.time}>
							{({r}) => r}
						</CountdownCircleTimer>
						</div>
					</Col>}
				</Row>
				<Row className="sound-player justify-content-center">
					<ReactAudioPlayer src={`${BASE_URL}/${this.state.sound}`} autoPlay controls/>
				</Row>
				{gamePane}
			</Container>
		);
	}
}

export default Game;