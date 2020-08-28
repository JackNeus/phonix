import React, { Component } from 'react';
import {Container, Row, Col, Button, Table} from 'react-bootstrap';
import socket from '../socket';

class Game extends Component {
	constructor(props) {
		super(props);
		this.state = {
			gameId: props.gameId,
			round: -1
		};
		this.handleSubmitGuess = this.handleSubmitGuess.bind(this);
	}

	componentDidMount() {
		socket.on("gameUpdate", (data) => {
			this.setState({
				round: data.round,
				phase: data.phase,
				guessed: false,
				sound: data.sound,
				guesses: data.guesses
			});
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

	render() {
		let gamePane;
		if (this.state.phase == "GUESS") {
			gamePane = (
			<div>
				Your guess: <input type="text" 
					disabled = {this.state.guessed}
					onKeyDown = {this.handleSubmitGuess} />
			</div>);
		} else if (this.state.phase == "VOTE") {
			gamePane = (
			<Table>
				<tbody>
					{this.state.guesses.map((guess)	=> {
						return (<tr key={guess.uid}><td>{guess.guess}</td></tr>);
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