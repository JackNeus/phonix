import React, { Component } from 'react';
import {Container, Row, Col, Button} from 'react-bootstrap';
import socket from '../socket';

const names = ["Craig", "Jeffrey", "Klaus", "Velma", "Oscar", "Thomas", "Lizzy"];
const getRandomName = () => {
	return names[Math.floor(Math.random() * names.length)];
}
const defaultUsername = getRandomName();

class Landing extends Component {
	constructor(props) {
		super();
		this.state = {};
		this.state.username = defaultUsername;
		this.state.joinId = props.joinId ? props.joinId : "";

		this.handleChange = this.handleChange.bind(this);
		this.setUsername = this.setUsername.bind(this);
		this.handleCreateGame = this.handleCreateGame.bind(this);
		this.handleJoinGame = this.handleJoinGame.bind(this);
	}

	componentDidMount() {
		this.setUsername();
	}

	handleChange(e) {
		this.setState({[e.target.name] : [e.target.value]});
	}

	setUsername(e) {
		socket.emit('setUsername', this.state.username);
	}

	handleCreateGame(e) {
		socket.emit('makeGame', (gameId) => {
			// TODO: don't redirect just yet, as doing so 
			// makes things like the 'back button' wonky
			this.props.history.push(`/lobby/${gameId}`);
		});
	}

	handleJoinGame() {
		this.setUsername();
		this.props.history.push(`/lobby/${this.state.joinId}`);
	}

    render() {
        return (
        	<Container>
		      	<Row className="nickname-pane pane solid justify-content-center">
					<Col xs="auto">
						What's your name?&nbsp;
						<input className="usernameInput" type="text" 
							maxLength="14"
							name="username"
							value={this.state.username} 
							onChange={this.handleChange}
							onBlur={this.setUsername} />
					</Col>
				</Row>
				<Row className='game-buttons justify-content-center'>
					<Button className='createGame'
						placeholder="Create Game"
						onClick={this.handleCreateGame}>Create Game</Button>
					{this.state.joinId && <div>
						<Button className='joinGame'
							placeholder="Join Game"
							onClick={this.handleJoinGame}>Join Game {this.state.joinId}</Button>
					</div>}
				</Row>
			</Container>
        )
    }
}

export default Landing;