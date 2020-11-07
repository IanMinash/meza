import React, { createContext, useState, useEffect } from "react";
import Loader from "./components/Loader";
import { ThemeProvider } from "@material-ui/styles";
import {
  CssBaseline,
  Grid,
  IconButton,
  Snackbar,
  SnackbarContent,
} from "@material-ui/core";
import { green, red, blue } from "@material-ui/core/colors";
import { CloseOutlined } from "@material-ui/icons";
import { makeStyles } from "@material-ui/core/styles";
import { MuiPickersUtilsProvider } from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import { BrowserRouter as Router } from "react-router-dom";
import { Routes } from "./routes";
import theme from "./theme";
import Firebase from "./lib/firebase";

const useStyles = makeStyles((theme) => ({
  snackbarSuccess: {
    backgroundColor: green[700],
    color: theme.palette.getContrastText(green[700]),
  },
  snackbarError: {
    backgroundColor: red[700],
    color: theme.palette.getContrastText(red[700]),
  },
  snackbarInfo: {
    backgroundColor: blue[700],
    color: theme.palette.getContrastText(blue[700]),
  },
}));

export const SnackbarContext = createContext({
  snackbar: { open: false, message: "", color: "" },
  setSnackbar: (
    snackbarOptions = { message: "", open: false, color: "" }
  ) => {},
});

const App = () => {
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);
  const classes = useStyles();

  const [snackbar, setSnackbar] = useState({
    snackbar: {
      message: "",
      color: "",
      open: false,
    },
    setSnackbar: (
      snackbarOptions = { message: "", open: false, color: "" }
    ) => {
      setSnackbar({ ...snackbar, snackbar: snackbarOptions });
    },
  });

  const handleClose = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbar({
      ...snackbar,
      snackbar: { ...snackbar.snackbar, open: false },
    });
  };

  const getSnackbarClassName = () => {
    switch (snackbar.snackbar.color) {
      case "error":
        return classes.snackbarError;

      case "success":
        return classes.snackbarSuccess;

      case "info":
        return classes.snackbarInfo;

      default:
        return "";
    }
  };

  useEffect(() => {
    Firebase.isInitialized().then((val) => {
      setFirebaseInitialized(val);
    });
  }, []);

  return firebaseInitialized !== false ? (
    <ThemeProvider theme={theme}>
      {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
      <CssBaseline />
      {/* Necessary to provide snackbar so that context subscribers can call this component's setSnackbar instead of the default one */}
      <MuiPickersUtilsProvider utils={DateFnsUtils}>
        <SnackbarContext.Provider value={snackbar}>
          <Router>
            <Routes />
          </Router>
        </SnackbarContext.Provider>
      </MuiPickersUtilsProvider>
      <Snackbar
        open={snackbar.snackbar.open}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        autoHideDuration={4500}
        onClose={handleClose}
      >
        <SnackbarContent
          message={snackbar.snackbar.message}
          action={
            <IconButton
              size="small"
              aria-label="close"
              color="inherit"
              onClick={handleClose}
            >
              <CloseOutlined fontSize="small" />
            </IconButton>
          }
          className={getSnackbarClassName()}
        />
      </Snackbar>
    </ThemeProvider>
  ) : (
    <ThemeProvider theme={theme}>
      <Grid container alignItems="center" style={{ height: "100vh" }}>
        <Loader />
      </Grid>
    </ThemeProvider>
  );
};

export default App;
