import React, { useState, useRef, useEffect } from "react";
import { useHistory } from "react-router-dom";
import {
  Avatar,
  Button,
  CssBaseline,
  Container,
  TextField,
  Typography,
  ButtonGroup,
  Box,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { LockOutlined } from "@material-ui/icons";
import Firebase from "../lib/firebase";

const useStyles = makeStyles((theme) => ({
  "@global": {
    body: {
      backgroundColor: theme.palette.common.white,
    },
  },
  paper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
  },
  avatar: {
    margin: theme.spacing(1),
    backgroundColor: theme.palette.secondary.main,
  },
  form: {
    width: "100%", // Fix IE 11 issue.
    marginTop: theme.spacing(1),
  },
  submit: {
    margin: theme.spacing(3, 0, 2),
  },
}));

const SignIn = () => {
  const classes = useStyles();

  const history = useHistory();

  const [signInMethod, setSignInMethod] = useState("phone");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpVerifier, setOtpVerifier] = useState(null);
  const [phoneError, setPhoneError] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [otpError, setOtpError] = useState(false);
  const [error, setError] = useState("");

  const appVerifier = useRef(null);

  const requestOtp = async () => {
    try {
      let confirmationResult = await Firebase.signInWithPhone(
        phone,
        appVerifier.current
      );
      setOtpVerifier(confirmationResult);
    } catch (error) {
      switch (error.code) {
        case "auth/missing-phone-number":
          setError("Please enter a phone number and try again");
          setPhoneError(true);
          break;
        case "auth/invalid-phone-number":
          setError("The phone number you provided is invalid");
          setPhoneError(true);
          break;
        case "auth/user-disabled":
          setError("Your account has been disabled");
          setPhoneError(true);
          break;

        default:
          setError(error.message);
          break;
      }
    }
  };

  const signIn = async () => {
    try {
      if (signInMethod === "phone") {
        await otpVerifier.confirm(otp);
        history.replace("/");
      } else if (signInMethod === "email") {
        await Firebase.signInWithEmail(email, password);
        history.replace("/");
      }
    } catch (error) {
      let errorCode = error.code;
      let errorMessage = error.message;
      switch (errorCode) {
        case "auth/user-not-found":
          setError("The email address doesn't live here");
          setEmailError(true);
          break;
        case "auth/wrong-password":
          setError("The password you provided is wrong");
          setPasswordError(true);
          break;
        case "auth/invalid-verification-code":
          setError("The verification code you've put is invalid.");
          setOtpError(true);
          break;
        default:
          setError(errorMessage);
          break;
      }
    }
    return false;
  };

  useEffect(() => {
    appVerifier.current = new Firebase.recaptchaVerifier("otp-button", {
      size: "invisible",
      callback: (response) => {
        signIn();
      },
    });
  }, []);

  const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

  return (
    <div>
      <Container component="main" maxWidth="xs">
        <CssBaseline />
        <div className={classes.paper}>
          <Avatar className={classes.avatar}>
            <LockOutlined />
          </Avatar>
          <Typography component="h1" variant="h5">
            Log in
          </Typography>
          <form
            className={classes.form}
            onSubmit={(e) => e.preventDefault() && false}
          >
            <Box my="1em">
              <ButtonGroup
                disableElevation
                color="primary"
                size="large"
                fullWidth
              >
                <Button
                  variant={signInMethod === "phone" ? "contained" : "outlined"}
                  onClick={(e) => setSignInMethod("phone")}
                >
                  Phone
                </Button>
                <Button
                  variant={signInMethod === "email" ? "contained" : "outlined"}
                  onClick={(e) => setSignInMethod("email")}
                >
                  Email
                </Button>
              </ButtonGroup>
            </Box>
            {signInMethod === "email" && (
              <>
                <TextField
                  variant="outlined"
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label="Email Address"
                  name="email"
                  autoComplete="email"
                  autoFocus
                  type="email"
                  value={email}
                  error={emailError}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={(e) => {
                    emailRegex.test(e.target.value.toLowerCase())
                      ? setEmailError(false)
                      : setEmailError(true);
                  }}
                />
                <TextField
                  variant="outlined"
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="Password"
                  type="password"
                  id="password"
                  autoComplete="current-password"
                  value={password}
                  error={passwordError}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={(e) =>
                    e.target.value.length >= 6
                      ? setPasswordError(false)
                      : setPasswordError(true)
                  }
                />
              </>
            )}
            {signInMethod === "phone" && (
              <>
                <Box
                  display="flex"
                  justifyContent="between"
                  alignItems="center"
                >
                  <Box flexGrow={1} mr="1em">
                    <TextField
                      variant="outlined"
                      margin="normal"
                      required
                      fullWidth
                      id="phone"
                      label="Phone Number"
                      name="phone"
                      autoComplete="tel"
                      autoFocus
                      type="tel"
                      value={phone}
                      error={phoneError}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </Box>
                  <Box>
                    <Button
                      id="otp-button"
                      variant="outlined"
                      onClick={(e) => requestOtp()}
                      size="large"
                      disableElevation
                    >
                      Get Code
                    </Button>
                  </Box>
                </Box>
                <TextField
                  variant="outlined"
                  margin="normal"
                  required
                  fullWidth
                  id="otp"
                  label="One Time Code"
                  name="otp"
                  autoComplete="one-time-code"
                  autoFocus
                  type="number"
                  value={otp}
                  error={otpError}
                  onChange={(e) => setOtp(e.target.value)}
                />
              </>
            )}
            <Typography variant="body2" color="error">
              {error}
            </Typography>
            <Button
              fullWidth
              variant="contained"
              color="secondary"
              className={classes.submit}
              type="submit"
              size="large"
              onClick={signIn}
            >
              Sign In
            </Button>
            {/*
            <!-- 
            <Grid container>
              <Grid item xs>
                <Link to="#">Forgot password?</Link>
              </Grid>
              <Grid item>
                <Link to="#">Don't have an account? Sign Up</Link>
              </Grid>
            </Grid>
            -->*/}
          </form>
        </div>
      </Container>
    </div>
  );
};

export default SignIn;
