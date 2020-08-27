import React, { Component } from 'react';

class Landing extends Component {
    render() {
        return (
        	<div>
		      <div class="form">
				<h3 class="title">What's your nickname?</h3>
				<input class="usernameInput" type="text" maxlenght="14" value="Craig" />
				</div>
				<div class='GameButtons'>
					<button class='createGame' placeholder="Create Game">CreateGame</button>
				</div>
			</div>
        )
    }
}

export default Landing;