import axios from "axios";
import jwt_decode from "jwt-decode";

const currentUser = () => {
	if (window.userData === undefined) {
		return undefined;
	}
	return window.userData;
};

const handleLogin = (token) => {
	// Send token to localStorage
	localStorage.setItem("jwtToken", token);
	// Set token to Auth header
	if (token) {
		// Apply authorization token to every request if logged in
		axios.defaults.headers.common["Authorization"] = token;
	} else {
		// Delete auth header
		delete axios.defaults.headers.common["Authorization"];
	}
	// Decode token to get token data.
	window.userData = jwt_decode(token);
	return window.userData;
};

const handleLogout = () => {
	localStorage.removeItem("jwtToken");
	window.userData = undefined;
};

export { currentUser, handleLogin, handleLogout };