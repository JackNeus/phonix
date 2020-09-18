import React, { Component } from 'react';
import { Container, Row, Col, Table, Button } from 'react-bootstrap';
import ReactAudioPlayer from 'react-audio-player';
import { CountdownCircleTimer } from 'react-countdown-circle-timer';
import socket from '../socket';
import * as timesync from 'timesync';

const BASE_URL = `${process.env.REACT_APP_SERVER_URL}/assets/`;
const ROUND_COUNT = parseInt(process.env.REACT_APP_ROUND_COUNT) || 3;

var ts = timesync.create({
	server: `${process.env.REACT_APP_SERVER_URL}/timesync`
});

class Game extends Component {
	constructor(props) {
		super(props);
		this.state = {
			gameId: props.gameId,
			round: 0,
			guess: false,
			timeoutStart: -1,
			timeoutEnd: -1,
		};
		this.handleSubmitGuess = this.handleSubmitGuess.bind(this);
		this.handleSendVote = this.handleSendVote.bind(this);
		this.handleSkip = this.handleSkip.bind(this);
	}

	componentDidMount() {
		socket.on("gameUpdate", (data) => {
			if (data.gameId !== this.state.gameId) return;
			this.setState({
				round: data.round,
				phase: data.phase,
				sound: data.sound,
				ts: ts.now(),
				timeoutStart: data.timeoutStart,
				timeoutEnd: data.timeoutEnd,
				guesses: data.guesses
			});
			if (data.phase === "GUESS") {
				this.setState({
					guess: false,
					vote: null,
				});
			}
		})
		// This is necessary because if the tab is inactive, the
		// render function will be called but the results of the
		// render function will not be properly rendered until
		// the tab becomes active. This means that the timer will be
		// off.
		this.tsTimer = setInterval(() => {
			this.setState({ts: ts.now()});
		}, 5000);
	}

	componentWillUnmount() {
		socket.off("gameUpdate");
		clearInterval(this.tsTimer);
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

	handleSkip() {
		if (this.state.phase !== "RESULTS") return;
		socket.emit("skipResults", {
			gameId: this.state.gameId,
			round: this.state.round,
		});

	}

	render() {
		let gamePane;

		let inGuessPhase = this.state.phase === "GUESS";
		let inVotePhase = this.state.phase === "VOTE";
		let inResultsPhase = this.state.phase === "RESULTS";
		let lastRound = this.state.round === ROUND_COUNT;

		if (inGuessPhase) {
			gamePane = (
			<div>
				Your guess: <input type="text" 
					disabled={this.state.guess !== false}
					onKeyDown={this.handleSubmitGuess} />
			</div>);
		} else if (inVotePhase || inResultsPhase) {
			let table = (
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
			</Table>);
			gamePane = (
				<React.Fragment>
					{table}
					{inResultsPhase && !lastRound &&
						<Button onClick={this.handleSkip}>Next Round</Button>
					}
				</React.Fragment>
			);
		}
		if (this.state.timeoutStart !== -1) {
			var duration = (this.state.timeoutEnd - this.state.timeoutStart) / 1000;
			var remaining = (this.state.timeoutEnd - this.state.ts) / 1000;

			var timer = (
				<CountdownCircleTimer
					key={this.state.ts}
					isPlaying
					size={35}
					strokeWidth={5}
					strokeCap="square"
					colors={[["#3498db"]]}
					duration={duration}
					initialRemainingTime={remaining}>
					{({r}) => r}
				</CountdownCircleTimer>);
		}

		return (
			<Container>
				<Row className="game-info">
					<Col>Round: {this.state.round}</Col>
					<Col>
						<div className="timer">
						{timer}
						</div>
					</Col>
				</Row>
				<Row className="sound-player justify-content-center">
					{this.state.sound !== undefined &&
						<ReactAudioPlayer src={`${BASE_URL}/${this.state.sound}`} autoPlay controls/>
					}
				</Row>
				{gamePane}
			</Container>
		);
	}
}

export default Game;