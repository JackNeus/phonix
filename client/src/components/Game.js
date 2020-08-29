import React, { Component } from 'react';
import {Container, Row, Col, Button, Table} from 'react-bootstrap';
import socket from '../socket';

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
				guesses: [
					{uid: 1, guess: "apple", votes: 10},
					{uid: 2, guess: "banana", votes: 2},
					{uid: 3, guess: "pear", votes: 3},
					{uid: 4, guess: "orange", votes: 0}]//data.guesses
			});
			if (data.phase === "GUESS") {
				this.setState({
					guess: false,
					vote: null,
				});
			}
			console.log(data);
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
			this.setState({guessed: true});
		}
	}

	handleSendVote(guess) {
		console.log("Vote attempted.");
		// It is not time to vote or user already voted.
		if (this.state.phase != "VOTE" || this.state.vote) return;
		console.log("Voted for ", guess);
		this.setState({vote: guess.uid});
		socket.emit("sendVote", {
			gameId: this.state.gameId,
			round: this.state.round,
			vote: guess.uid
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
					disabled = {this.state.guess}
					onKeyDown = {this.handleSubmitGuess} />
			</div>);
		} else if (inVotePhase || inResultsPhase) {
			gamePane = (
			<Table striped hover={inVotePhase} className="vote-table">
				<tbody>
					{this.state.guesses.map((guess)	=> {
						let voteCount = (<span className="vote-count">{guess.votes}</span>)
						return (<tr key={guess.uid}>
							<td value={guess.uid}
								className={this.state.vote === guess.uid ? "voted" : ""}
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
				<Row>round: {this.state.round}</Row>
				<Row>sound: {this.state.sound}</Row>
				{gamePane}
			</Container>
		);
	}
}

export default Game;