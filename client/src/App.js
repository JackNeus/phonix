import React from 'react';
import { BrowserRouter as Router, Route } from "react-router-dom";
import { Redirect } from "react-router";
import { Container, Row } from 'react-bootstrap';

import PrivateRoute from "./components/auth/PrivateRoute";
import './App.scss';

import Login from "./components/auth/Login";
import { handleLogin, handleLogout } from "./utils/auth";

import Landing from "./components/Landing";
import Lobby from "./components/Lobby";
import Admin from "./components/admin/Admin";

// Check for token to keep admin logged in
if (localStorage.jwtToken) {
  console.log("Found token, restoring session");
  let decoded = handleLogin(localStorage.jwtToken);

  // Check for expired token
  const currentTime = Date.now() / 1000;
  if (decoded.exp < currentTime) {
    handleLogout();

    console.log("Token expired, logging out");
    window.location.href = "./login";
  }
}

function App() {
  return (
    <Container>
      <Row className="page-elt phonix justify-content-center">
        <h1>Phonix</h1>
      </Row>
      <Router>
        <div className="App">
          <Route exact path="/" component={Landing} />
          <Route exact path="/login" component={Login} />
          <Route exact path="/logout" render={(props) => {
            handleLogout();
            return (<Redirect to="/" />)
          }}/>
          <PrivateRoute exact path="/admin" component={Admin} />
          <Route exact path="/l/:joinId" component={(props) => (<Landing joinId={props.match.params.joinId} {...props}/>)} />
          <Route exact path="/lobby/:gameId"
            component={(props) => (<Lobby gameId={props.match.params.gameId} {...props}/>)} />
        </div>
      </Router>
    </Container>
  );
}

export default App;
