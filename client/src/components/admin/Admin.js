import React, { Component } from 'react';
import { Container } from 'react-bootstrap';

class Admin extends Component {
	constructor(props) {
		super();
	}

    render() {
        return (
        	<Container>
        		<h3>Welcome to the Admin Page!</h3>
        	</Container>
        )
    }
}

export default Admin;