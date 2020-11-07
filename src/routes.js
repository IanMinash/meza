import { Switch, Route } from "react-router-dom";
import SignIn from "./components/SignIn";
import Home from "./components/Home";
import AccountSettings from "./components/AccountSettings";
import PrivateRoute from "./components/PrivateRoute";

export const Routes = () => {
  return (
    <Switch>
      <Route exact path="/sign-in">
        <SignIn />
      </Route>
      <PrivateRoute exact path="/">
        <Home />
      </PrivateRoute>
      <PrivateRoute exact path="/account-settings">
        <AccountSettings />
      </PrivateRoute>
    </Switch>
  );
};
