import React, { Component } from 'react';
import { Col } from 'react-bootstrap';
import socket from '../socket';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCommentDots, faArrowRight } from '@fortawesome/free-solid-svg-icons';

class Chat extends Component {
	constructor(props) {
		super();
		this.state = {
			collapsed: props.collapsed,
			chat: [],
		};
		this.toggleChat = this.toggleChat.bind(this);
		this.handleChange = this.handleChange.bind(this);
	}

	componentDidMount() {
		socket.on("chatMessage", (data) => {
			let chat = this.state.chat;
			chat.push(data);
			chat.sort((x, y) => { return x.time < y.time });
			this.setState({
				chat: chat
			});
		});
	}

	componentWillUnmount() {
		socket.off("chatMessage");
	}

	toggleChat(state) {
		this.setState({
			collapsed: state,
		});
	}

	handleChange(e) {
		if (e.key === "Enter") {
			socket.emit("sendMessage", {
				id: socket.id,
				username: localStorage.username,
				message: e.target.value,
			});
			e.target.value = "";
			e.preventDefault();
		}
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
							{this.state.chat.map((message) => {
								let classes = message.id === socket.id ? "msg self-msg" : "msg";
								return (
									<div className={classes}><span className="name">{message.username}: </span>{message.message}</div>
								);
							})}
						</div>
						<input className="message-box" name="message" type="text"
							autoComplete="off"
							onKeyDown={this.handleChange}/>
					</span>
					)
				}
			</Col>
		)
	}
}

export default Chat;