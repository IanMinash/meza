import { Route, Redirect } from "react-router-dom";
import Firebase from "../lib/firebase";

const PrivateRoute = ({ children, location, ...rest }) => {
  return Firebase.auth.currentUser ? (
    <Route {...rest}>{children}</Route>
  ) : (
    <Redirect
      to={{
        pathname: "/sign-in",
        state: { from: location },
      }}
    />
  );
};

export default PrivateRoute;
