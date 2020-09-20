import React, { Component } from "react";

import { Container, Row, Col, Button } from 'react-bootstrap';

import axios from "axios";
import { currentUser, handleLogin } from "../../utils/auth";

class Login extends Component {
  constructor() {
    super();
    this.state = {
      password: "",
      errors: {},
    };
    this.onSubmit = this.onSubmit.bind(this);
  }

  onChange = (e) => {
    this.setState({ [e.target.id]: e.target.value });
  };

  onSubmit = (e) => {
    e.preventDefault();

    let userData = {
       password: this.state.password
    };

    axios
      .post(`${process.env.REACT_APP_SERVER_URL}/login`, userData)
      .then((res) => {
        const { token } = res.data;
        handleLogin(token);
        this.setState({
          errors: {},
        });
        this.props.history.push("/admin");
      })
      .catch((error) => {
        console.log(error);
        this.setState({
          errors: error.response.data,
        });
      });
  };

  componentDidMount() {
    // If logged in, redirect.
    if (currentUser()) {
      console.log("Already logged in, redirecting...");
      this.props.history.push("/admin");
    }
  }

  render() {
    const { errors } = this.state;

    return (
      <Container className="page-elt pane light login-pane">
        <Row className="solid justify-content-center">
          <Col xs="auto">
            Admin Password: &nbsp;
            <input
              onChange={this.onChange}
              value={this.state.password}
              error={errors.password}
              id="password"
              type="password"
            />
          </Col>
        </Row>
        <Row className="justify-content-center">
          <Col xs="auto">
            <span className="red-text">
              {errors.password}
              {errors.passwordincorrect}
            </span>
          </Col>
        </Row>
        <Row className="login-btn justify-content-center">
          <Col xs="auto">
            <Button type="submit" onClick={this.onSubmit}>Login</Button>
          </Col>
        </Row>
      </Container>
    );
  }
}

export default Login;