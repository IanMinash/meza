import { useState } from "react";
import { AppBar, Card, CardContent, Typography } from "@material-ui/core";
import BaseDash, { useStyles } from "./BaseDash";
import Firebase from "../lib/firebase";

const AccountSettings = () => {
  const user = useState(Firebase.getCurrentUser());
  const classes = useStyles();
  return (
    <BaseDash>
      <AppBar
        component="div"
        className={classes.secondaryBar}
        color="primary"
        position="static"
      >
        <Typography variant="h5" component="h1">
          Account Settings
        </Typography>
      </AppBar>
    </BaseDash>
  );
};

export default AccountSettings;
