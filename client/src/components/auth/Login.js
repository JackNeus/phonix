import React, { Component } from "react";
import classnames from "classnames";

import axios from "axios";
import { currentUser, handleLogin } from "../../utils/auth";

class Login extends Component {
  constructor() {
    super();
    this.state = {
      password: "",
      errors: {},
    };
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
      <div className="container">
        <div style={{ marginTop: "4rem" }} className="row">
          <div className="col s8 offset-s2">
            <form noValidate onSubmit={this.onSubmit}>
              <div className="input-field col s12">
                <input
                  onChange={this.onChange}
                  value={this.state.password}
                  error={errors.password}
                  id="password"
                  type="password"
                  className={classnames("", {
                    invalid: errors.password || errors.passwordincorrect,
                  })}
                />
                <label htmlFor="password">Password</label>
                <span className="red-text">
                  {errors.password}
                  {errors.passwordincorrect}
                </span>
              </div>
              <div className="col s12" style={{ paddingLeft: "11.250px" }}>
                <button
                  style={{
                    width: "150px",
                    borderRadius: "3px",
                    letterSpacing: "1.5px",
                    marginTop: "1rem",
                  }}
                  type="submit"
                  className="btn btn-large waves-effect waves-light hoverable blue accent-3"
                >
                  Login
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }
}

export default Login;