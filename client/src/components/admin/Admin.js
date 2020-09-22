import React, { Component } from 'react';
import { Container, Row, Col, Form, Button, Table } from 'react-bootstrap';
import axios from "axios";
import ReactAudioPlayer from 'react-audio-player';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashAlt } from '@fortawesome/free-solid-svg-icons';

const API_ROOT = `${process.env.REACT_APP_SERVER_URL}/api`;
const BASE_SOUND_URL = `${process.env.REACT_APP_SERVER_URL}/assets/`;

class Admin extends Component {
	constructor(props) {
		super();
		this.state = {
			addErrors: {},
			sounds: []
		};
		this.getSounds = this.getSounds.bind(this);
		this.deleteSound = this.deleteSound.bind(this);
		this.handleSubmit = this.handleSubmit.bind(this);
	}

	componentDidMount() {
		this.getSounds();
	}

	getSounds() {
		axios.get(`${API_ROOT}/sounds`).then((res) => {
			this.setState({ sounds: res.data });
		});
	}

	handleSubmit(e) {
		e.preventDefault();

		const form = e.currentTarget;
		let formData = new FormData();
		formData.append("file", form.elements.file.files[0]);
		formData.append("answer", form.elements.answer.value);
		let acceptValues = form.elements.accept.value.split(/\n+/)
			.map(word => {
			return word.toLowerCase().trim();
		});
		formData.append("accept", acceptValues);

		axios.post(`${API_ROOT}/sound`, formData, {
			headers: { "Content-Type" : "multipart/form-data" }
		})
			.then((res) => {
				this.getSounds();
			})
			.catch((err) => {
				this.setState({addErrors: err.response.data});
			});
	}

	deleteSound(id) {
		axios.delete(`${API_ROOT}/sound/${id}`)
			.then((res) => {
				this.getSounds();
			})
			.catch((err) => {
				this.getSounds();
			});
	}

    render() {
        return (
        	<Container>
	        	<Row className="page-elt">
	        		<Col className="pane left-pane justify-content-center" md="4">
	        			<h5>Add Sound</h5>
		        		<Form onSubmit={this.handleSubmit}>
	        				<Form.Group>
	        					<Form.Label>Sound File</Form.Label>
	        					<Form.File name="file"/>
	        					{this.state.addErrors.file && <Form.Text>{this.state.addErrors.file}</Form.Text>}
	        				</Form.Group>
	        				<Form.Group>
	        					<Form.Label>Answer</Form.Label>
	        					<Form.Control name="answer" type="text" autoComplete="off" placeholder="car alarm"/>
	        					{this.state.addErrors.answer && <Form.Text>{this.state.addErrors.answer}</Form.Text>}
	        				</Form.Group>
	        				<Form.Group>
	        					<Form.Label>Accept Also</Form.Label>
	        					<Form.Control name="accept" as="textarea" autoComplete="none" placeholder="car&#x0a;car horn"/>
	        				</Form.Group>
	        				<Button type="submit">
	        					Submit
	        				</Button>
		        		</Form>
	        		</Col>
	        		<Col className="pane sound-pane">
	        			<Table>
		        			<thead>
								<tr>
									<th>Sound</th>
									<th>Answer</th>
									<th>Accept</th>
									<th></th>
									<th></th>
								</tr>
							</thead>
							<tbody>
								{this.state.sounds.map((sound) => {
									return (
										<tr key={sound._id}>
											<td>
												<ReactAudioPlayer
													className="audio-player"
													src={`${BASE_SOUND_URL}/${sound.filename}`}
													controls/>
											</td>
											<td>{sound.answer}</td>
											<td>{sound.accept.join(",")}</td>
											<td></td>
											<td><FontAwesomeIcon className="delete-sound"
												icon={faTrashAlt}
												onClick={() => {this.deleteSound(sound._id)}}
											/></td>
										</tr>
									);
								})}
							</tbody>
	        			</Table>
	        		</Col>
	        	</Row>
	        </Container>
        )
    }
}

export default Admin;