import React from 'react';
import { BrowserRouter as Router, Route} from "react-router-dom";
import './App.css';

import Landing from "./components/Landing";
import Lobby from "./components/Lobby";

function App() {
  return (
    <Router>
      <div className="App">
        <Route exact path="/" component={Landing} />
        <Route exact path="/:gameId"
          component={(props) => (<Lobby gameId={props.match.params.gameId} {...props}/>)} />
      </div>
    </Router>
  );
}

export default App;
