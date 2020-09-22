import React, { Component } from 'react';
import { Container, Row, Col, Form, Button, Table } from 'react-bootstrap';
import axios from "axios";
import ReactAudioPlayer from 'react-audio-player';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashAlt, faEdit, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { ClipLoader } from 'react-spinners';

const API_ROOT = `${process.env.REACT_APP_SERVER_URL}/api`;
const BASE_SOUND_URL = `${process.env.REACT_APP_SERVER_URL}/assets/`;

class Admin extends Component {
	constructor(props) {
		super();
		this.state = {
			errors: {},
			editSound: undefined,
			loading: false,
			answer: "",
			accept: "",
			sounds: []
		};
		this.getSounds = this.getSounds.bind(this);
		this.editSound = this.editSound.bind(this);
		this.clearEdit = this.clearEdit.bind(this);
		this.deleteSound = this.deleteSound.bind(this);
		this.handleSubmitAdd = this.handleSubmitAdd.bind(this);
		this.handleSubmitEdit = this.handleSubmitEdit.bind(this);
		this.handleChange = this.handleChange.bind(this);
		this.getAcceptVals = this.getAcceptVals.bind(this);
	}

	componentDidMount() {
		this.getSounds();
	}

	handleChange(e) {
		this.setState({[e.target.name] : e.target.value});
	}

	getSounds() {
		axios.get(`${API_ROOT}/sounds`).then((res) => {
			this.setState({ sounds: res.data });
		});
	}

	getAcceptVals() {
		if (this.state.accept.trim() === "") return [];

		return this.state.accept.split(/\n+/)
			.map(word => {
			return word.toLowerCase().trim();
		});
	}

	handleSubmitAdd(e) {
		e.preventDefault();

		const form = e.currentTarget;
		let formData = new FormData();

		formData.append("file", form.elements.file.files[0]);
		formData.append("answer", this.state.answer);
		formData.append("accept", this.getAcceptVals());

		this.setState({ loading: true });
		axios.post(`${API_ROOT}/sound`, formData, {
			headers: { "Content-Type" : "multipart/form-data" }
		})
			.then((res) => {
				form.elements.file.value = null;
				this.setState({
					answer: "",
					accept: "",
					errors: {},
					loading: false,
				});

				this.getSounds();
			})
			.catch((err) => {
				this.setState({ loading: false });
				if (err.response)
					this.setState({errors: err.response.data});
			});
	}

	handleSubmitEdit(e) {
		e.preventDefault();

		let formData = new FormData();

		formData.append("answer", this.state.answer);
		formData.append("accept", this.getAcceptVals());

		this.setState({
			loading: true,
		});
		axios.put(`${API_ROOT}/sound/${this.state.editSound._id}`, formData, {
			headers: { "Content-Type" : "multipart/form-data" }
		})
			.then((res) => {
				this.setState({
					errors: {},
					loading: false
				});
				this.getSounds();
			})
			.catch((err) => {
				console.log(err);
				this.setState({
					loading: false,
					errors: err.response.data
				});
			});
	}

	editSound(sound) {
		this.setState({ 
			editSound: sound,
			answer: sound.answer,
			accept: sound.accept.join("\n"),
		});
	}

	clearEdit() {
		this.setState({
			editSound: undefined,
			answer: "",
			accept: "",
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

	handleReload() {
		axios.post(`${API_ROOT}/reload`)
			.catch((err) => {
				console.log(err);
			})
	}

    render() {
        return (
        	<Container>
        		<Row className="justify-content-center">
		        	<Button onClick={this.handleReload}>Reload Phonix Sound Pack</Button>
        		</Row>
	        	<Row className="page-elt">
	        		<Col className="admin-left-col">
	        		  <div className="pane light add-edit-pane justify-content-center">
	        			<h5>
	        				{this.state.editSound && 
	        					<FontAwesomeIcon className="cancel-edit" icon={faArrowLeft} onClick={this.clearEdit}/>}
	        				{this.state.editSound ? "Edit Sound" : "Add Sound"}
	        			</h5>
		        		<Form onSubmit={this.state.editSound ? this.handleSubmitEdit : this.handleSubmitAdd}>
	        				{this.state.editSound ?
							<ReactAudioPlayer
								src={`${BASE_SOUND_URL}/${this.state.editSound.filename}`}
								controls/>
	        				:
	        				<Form.Group>
	        					<Form.Label>Sound File</Form.Label>
	        					<Form.File name="file"/>
	        					{this.state.errors.file && <Form.Text>{this.state.errors.file}</Form.Text>}
	        				</Form.Group>
	        				}
	        				<Form.Group>
	        					<Form.Label>Answer</Form.Label>
	        					<Form.Control type="text" autoComplete="off" 
	        						name="answer"
	        						placeholder="car alarm"
	        						onChange={this.handleChange}
	        						value={this.state.answer}/>
	        					{this.state.errors.answer && <Form.Text>{this.state.errors.answer}</Form.Text>}
	        				</Form.Group>
	        				<Form.Group>
	        					<Form.Label>Accept Also</Form.Label>
	        					<Form.Control as="textarea" autoComplete="none"
	        						name="accept"
	        						placeholder="car&#x0a;car horn"
	        						onChange={this.handleChange}
	        						value={this.state.accept}/>
	        				</Form.Group>
	        				<div className="d-flex flex-wrap align-content-center">
		        				<Button type="submit">
		        					{this.state.editSound ? "Edit Sound" : "Add Sound"}
		        				</Button>
		        				<span className="loading-icon">
			    					<ClipLoader
			    						size={30}
			    						color={"#3498db"}
			    						loading={this.state.loading}
			    					/>
			    				</span>
			    			</div>
		        		</Form>
		        	  </div>
	        		</Col>
	        		{/* TODO: responsive */}
	        		<Col className="pane sound-pane">
	        		  <div className="table-scroll">
	        			<Table>
		        			<thead>
								<tr>
									<th className="sound-th">Sound</th>
									<th className="answer-th">Answer</th>
									<th className="accept-th">Accept</th>
									<th></th>
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
											<td><FontAwesomeIcon className="edit-sound"
												icon={faEdit}
												onClick={() => this.editSound(sound)}
											/></td>
											<td><FontAwesomeIcon className="delete-sound"
												icon={faTrashAlt}
												onClick={() => {this.deleteSound(sound._id)}}
											/></td>
										</tr>
									);
								})}
							</tbody>
	        			</Table>
	        		  </div>
	        		</Col>
	        	</Row>
	        </Container>
        )
    }
}

export default Admin;