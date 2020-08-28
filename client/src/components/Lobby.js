import React, { Component } from 'react';
import socket from '../socket';

class Lobby extends Component {
	constructor(props) {
		super();
		this.state = {gameId: props.gameId};
	}

    render() {
        return (
        	<div>
		      <p>Lobby: {this.state.gameId}</p>
			</div>
        )
    }
}

export default Lobby;