import React, { Component } from 'react';

class IdentifyGameHelp extends Component {
	render() {
		return (
			<React.Fragment>
				A round in Phonix's "Identify" Game Mode consists of three phases:<br />
				1. <strong>Identify</strong>. A sound will be played.
				Submit your guess for what it is!<br />
				2. <strong>Vote</strong>. The correct answer has been
				shuffled in with players' guesses. Vote for what you think
				is correct (or funniest)!<br />
				3. <strong>Scoring</strong>. Receive <strong>+3</strong> points
				for guessing the sound correctly. Receive <strong>+1</strong> points
				for voting for the correct answer. And 
				receive <strong>+1</strong> points for each 
				player who votes for your guess!
			</React.Fragment>
		)
	}
}

export default IdentifyGameHelp;