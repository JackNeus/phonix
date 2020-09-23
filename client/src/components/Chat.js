import React, { Component } from 'react';
import { Col } from 'react-bootstrap';
import socket from '../socket';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCommentDots, faArrowRight } from '@fortawesome/free-solid-svg-icons';

class Chat extends Component {
	constructor(props) {
		super();
		this.state = {
			collapsed: props.collapsed
		};
		this.toggleChat = this.toggleChat.bind(this);
	}

	componentDidMount() {

	}

	toggleChat(state) {
		this.setState({
			collapsed: state,
		});
	}

	render() {
		let classes = "pane chat-pane ";
		if (this.state.collapsed) classes += "collapsed";

		return (
			<Col className={classes} lg="auto" md={12}>
				{this.state.collapsed ?
					<div className="expand-btn d-flex justify-content-center">
						<FontAwesomeIcon
						icon={faCommentDots}
						onClick={() => this.toggleChat(false)}/>
					</div>
				:
					(<span>
						<div className="collapse-btn d-flex justify-content-end">
							<FontAwesomeIcon
								icon={faArrowRight}
								onClick={() => this.toggleChat(true)}/>
						</div>
						<div className="chat-box">

						</div>
						<input className="message-box" name="message" type="text"/>
					</span>
					)
				}
			</Col>
		)
	}
}

export default Chat;