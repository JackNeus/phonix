import React, { Component } from 'react';
import { Container, Row, Col, Button, Table, OverlayTrigger, Tooltip} from 'react-bootstrap';
import Switch from "react-switch";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons';

import socket from '../socket';

const capitalizeFirstLetter = (s) => {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

const names = ["Craig", "Jeffrey", "Klaus", "Velma", "Oscar", "Thomas", "Lizzy"];
const getRandomName = () => {
	return names[Math.floor(Math.random() * names.length)];
}
const defaultUsername = localStorage.setUsername === true ? localStorage.username : getRandomName();

const IDENTIFY_GAMEMODE = "identify";
const CREATIVE_GAMEMODE = "creative";
const CREATIVE_DISABLED = false;

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
			gameList: [],
			gameMode: IDENTIFY_GAMEMODE,
		};
		this.handleUsernameChange = this.handleUsernameChange.bind(this);
		this.handlePublicGame = this.handlePublicGame.bind(this);
		this.setUsername = this.setUsername.bind(this);
		this.handleCreateGame = this.handleCreateGame.bind(this);
		this.handleSelectGame = this.handleSelectGame.bind(this);
		this.handleJoinGame = this.handleJoinGame.bind(this);
		this.toggleGameMode = this.toggleGameMode.bind(this);
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

	handleUsernameChange(e) {
		this.setState({[e.target.name] : [e.target.value]});
		localStorage.setUsername = true;
	}

	handlePublicGame(checked) {
		this.setState({
			publicGame: checked
		});
	}

	setUsername(e) {
		localStorage.username = this.state.username;
		socket.emit('setUsername', this.state.username);
	}

	handleCreateGame(e) {
		this.setUsername();
		socket.emit('makeGame', {public: this.state.publicGame,	gameMode: this.state.gameMode},
			(gameId) => {
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

	toggleGameMode() {
		if (this.state.gameMode === IDENTIFY_GAMEMODE) {
			this.setState({
				gameMode: CREATIVE_GAMEMODE
			});
		} else {
			this.setState({
				gameMode: IDENTIFY_GAMEMODE
			});
		}
	}

    render() {
    	let switchChecked = this.state.gameMode === CREATIVE_GAMEMODE;
        return (
        	<Container>
		      	<Row className="page-elt pane nickname-pane solid justify-content-center">
					<Col xs="auto">
						What's your name?&nbsp;
						<input className="usernameInput" type="text" 
							maxLength="12"
							name="username"
							value={this.state.username} 
							onChange={this.handleUsernameChange}
							onBlur={this.setUsername} 
							autoComplete="off" />
					</Col>
				</Row>
				<Row className='page-elt pane light lobby-buttons justify-content-center'>
					<Container>
						<Row className="justify-content-center d-flex align-content-center">
							<div className="public-game d-flex align-content-center">
								<Switch 
									checkedIcon={false}
									uncheckedIcon={false}
									height={20}
									width={50}
									onColor="#3498db"
									offColor="#95a5a6"
									onChange={this.handlePublicGame}
									checked={this.state.publicGame}/>
								<span>&nbsp;Public Game</span>
							</div>
							<div className="game-mode d-flex align-content-center">
								<span><strong>Game Mode&nbsp;
									<div className="help-icon">
										<OverlayTrigger
											key='help'
											placement='bottom'
											overlay={
												<Tooltip>
													In "Identify" mode, players compete to correctly identify sounds.<br />
													In "Creative" mode, they're simply trying to come up with a guess that
													will get the most votes from their fellow players -- think "Apples to Apples"!
												</Tooltip>
											}
										>
											<FontAwesomeIcon icon={faQuestionCircle}/>
										</OverlayTrigger>
									</div>
								: </strong>Identify&nbsp;</span>
								<Switch 
									checkedIcon={false}
									uncheckedIcon={false}
									height={20}
									width={50}
									onColor="#3498db"
									offColor="#3498db"
									onChange={this.toggleGameMode}
									checked={switchChecked}
									disabled={CREATIVE_DISABLED}/>
								<span>&nbsp;Creative</span>
							</div>
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
								<th>Game Type</th>
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
										<td>{capitalizeFirstLetter(game.gameMode)}</td>
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