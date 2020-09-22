import React, { Component } from 'react';
import { Container, Row, Col, Button,
	Table } from 'react-bootstrap';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';

import socket from '../socket';

const names = ["Craig", "Jeffrey", "Klaus", "Velma", "Oscar", "Thomas", "Lizzy"];
const getRandomName = () => {
	return names[Math.floor(Math.random() * names.length)];
}
const defaultUsername = getRandomName();

class Landing extends Component {
	constructor(props) {
		super();
		// inviteId: initial joinId
		this.state = {
			username: defaultUsername,
			inviteId: props.joinId ? props.joinId : "",
			joinId: props.joinId ? props.joinId : "",
			errorMsg: "",
			publicGame: true,
			gameList: []
		};

		this.handleChange = this.handleChange.bind(this);
		this.handleCheck = this.handleCheck.bind(this);
		this.setUsername = this.setUsername.bind(this);
		this.handleCreateGame = this.handleCreateGame.bind(this);
		this.handleSelectGame = this.handleSelectGame.bind(this);
		this.handleJoinGame = this.handleJoinGame.bind(this);
	}

	componentDidMount() {
		this.setUsername();
		socket.on("gameList", (data) => {
			this.setState({gameList: data});
			let foundJoinGame = false;
			// If selected game has started, reset joinId.
			for (let i in data) {
				let game = data[i];
				if (this.state.joinId === game.id) {
					foundJoinGame = true;
					if (game.id !== this.state.inviteId && game.started) {
						this.setState({joinId: ""});
					}
				}
			}
			// If joinId is not in gameList, reset joinId.
			if (this.state.joinId && !foundJoinGame) {
				this.setState({
					joinId: "",
					errorMsg: `${this.state.joinId} does not exist.`
				});
			}
		});
		let games = this.state.joinId ? [this.state.joinId] : [];
		socket.emit("getGameList", games);
	}

	componentWillUnmount() {
		socket.off("gameList");
	}

	handleChange(e) {
		this.setState({[e.target.name] : [e.target.value]});
	}

	handleCheck(e) {
		this.setState({[e.target.name] : e.target.checked});
	}

	setUsername(e) {
		socket.emit('setUsername', this.state.username);
	}

	handleCreateGame(e) {
		this.setUsername();
		socket.emit('makeGame', {public: this.state.publicGame}, (gameId) => {
			this.props.history.push(`/lobby/${gameId}`);
		});
	}

	handleSelectGame(e) {
		if (e.started) return;
		this.setState({
			joinId: e.id,
			errorMsg: ""
		});
	}

	handleJoinGame() {
		this.setUsername();
		this.props.history.push(`/lobby/${this.state.joinId}`);
	}

    render() {
        return (
        	<Container>
		      	<Row className="page-elt pane nickname-pane solid justify-content-center">
					<Col xs="auto">
						What's your name?&nbsp;
						<input className="usernameInput" type="text" 
							maxLength="12"
							name="username"
							value={this.state.username} 
							onChange={this.handleChange}
							onBlur={this.setUsername} 
							autoComplete="off" />
					</Col>
				</Row>
				<Row className='page-elt pane light lobby-buttons justify-content-center'>
					<Container>
						<Row className="justify-content-center">
							<FormGroup row>
								<FormControlLabel control={
									<Checkbox color="primary"
										name="publicGame"
										checked={this.state.publicGame}
										onChange={this.handleCheck}
										/>}
									label="Public Game"
								/>
							</FormGroup>
							<Button className='createGame'
								placeholder="Create Game"
								onClick={this.handleCreateGame}>Create Game</Button>
							
						</Row>
						<Row className="justify-content-center">
							{this.state.joinId && <div>
							<hr />
							<Button className='joinGame'
								placeholder="Join Game"
								onClick={this.handleJoinGame}>Join Game {this.state.joinId}</Button>
							</div>}
						</Row>
						{this.state.errorMsg.length > 0 &&
						<Row className="justify-content-center">
							{this.state.errorMsg}
						</Row>}
					</Container>
				</Row>
				{this.state.gameList.length > 0 && <Row className="page-elt pane light">
					<h5>Public Games</h5>
					<Table responsive hover className="game-list">
						<thead>
							<tr>
								<th>Game Id</th>
								<th>Host</th>
								<th>Player Count</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{this.state.gameList.map((game)	=> {
								let classes = "";
								if (game.id === this.state.joinId) 
									classes = classes + " selected-row";
								if (game.id !== this.state.inviteId && game.started) 
									classes = classes + " disabled-row";
								return (
									<tr key={game.id}
										className={classes}
										onClick={() => {this.handleSelectGame(game)}}>
										<td>{game.id}</td>
										<td>{game.host}</td>
										<td>{game.playerCount}</td>
										<td>{game.started ? "In Progress" : "Open"}</td>
									</tr>
								);
							})}
						</tbody>
					</Table>
				</Row>}
			</Container>
        )
    }
}

export default Landing;