import React, { Component } from 'react';
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
		console.log(this.state);

		this.handleChange = this.handleChange.bind(this);
		this.setUsername = this.setUsername.bind(this);
		this.handleCreateGame = this.handleCreateGame.bind(this);
		this.handleJoinGame = this.handleJoinGame.bind(this);
	}

	componentDidMount() {
		this.setUsername();
	}

	handleChange(e) {
		console.log(e.target);	
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
        	<div>
		      <div className="form">
				<h3 className="title">What's your nickname?</h3>
				<input className="usernameInput" type="text" 
					maxLength="14"
					name="username"
					value={this.state.username} 
					onChange={this.handleChange}
					onBlur={this.setUsername} />
				</div>
				<br />
				<div className='GameButtons'>
					<button className='createGame'
						placeholder="Create Game"
						onClick={this.handleCreateGame}>Create Game</button>
					{this.state.joinId && <div>
						<input value={this.state.joinId} readOnly/>
						<button className='joinGame'
							placeholder="Join Game"
							onClick={this.handleJoinGame}>Join Game</button>
					</div>}
				</div>
			</div>
        )
    }
}

export default Landing;