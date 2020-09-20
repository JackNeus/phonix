import React from "react";
import { Redirect } from "react-router";
import { Route } from "react-router-dom";

import { currentUser } from "../../utils/auth.js";

const PrivateRoute = ({ component: Component, adminPage, ...rest }) => (
	// Redirect without an explanation if the user is logged in but not an admin.
	// They don't need an explanation!
	<Route
		{...rest}
		render={(props) =>
			currentUser() ? (
				<Component {...props} />
			) : (
				<Redirect to="/login" />
			)
		}
	/>
);

export default PrivateRoute;