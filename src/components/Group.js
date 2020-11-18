import { useState, useEffect, useContext } from "react";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  Divider,
  Grid,
  InputLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  TextField,
  Typography,
} from "@material-ui/core";
import {
  DoneOutline,
  ErrorOutline,
  EventNote,
  LocalAtm,
  Money,
  Payment,
  People,
} from "@material-ui/icons";
import { green, red } from "@material-ui/core/colors";
import { useParams } from "react-router-dom";
import { TransactionBuilder, Networks } from "stellar-sdk";
import { format } from "date-fns";
import BaseDash, { useStyles } from "./BaseDash";
import Loader from "./Loader";
import Firebase from "../lib/firebase";
import StellarServer, { operationString, paymentString } from "../lib/stellar";
import { getDay, ordinalSuffix } from "../lib/dateHelpers";
import { SnackbarContext } from "../App";

const axios = require("axios").default;
const SEND_STK_PUSH_URL =
  "https://europe-west3-meza-money.cloudfunctions.net/sendMPesaSTKPushDeposits";

const Group = () => {
  const user = Firebase.getCurrentUser();
  const { id } = useParams();
  const { setSnackbar } = useContext(SnackbarContext);

  const [group, setGroup] = useState(null);
  const [groupTransactions, setGroupTransactions] = useState([]);
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [depositTransactionId, setDepositTransactionId] = useState("");
  const [depositTransactionStatus, setDepositTransactionStatus] = useState({
    status: "pending",
  });

  const defaultDepositDetails = {
    userId: user.uid,
    amount: 0,
    phoneNumber: user.phoneNumber,
    chamaWallet: "",
    reason: "contribution",
  };

  const [depositDetails, setDepositDetails] = useState({
    ...defaultDepositDetails,
  });

  // Get the group
  useEffect(() => {
    (async () => {
      let group = await (
        await Firebase.firestore.doc(`groups/${id}`).get()
      ).data();
      setGroup(group);
      setDepositDetails({
        ...depositDetails,
        amount: group.monthlyContribution,
        chamaWallet: group.pubKey,
      });
    })();
  }, [id]);

  // Get the group's transactions
  useEffect(() => {
    if (group) {
      (async () => {
        let response = await StellarServer.payments()
          .forAccount(group.pubKey)
          .order("desc")
          .call();
        let transactions = response.records.map(
          (transactionRecord) => transactionRecord
        );
        setGroupTransactions(transactions);
      })();
    }
  }, [group]);

  // Start real-time listener for deposit transaction
  useEffect(() => {
    if (depositTransactionId) {
      const unsub = Firebase.firestore
        .doc(`deposits/${depositTransactionId}`)
        .onSnapshot(
          (snap) => {
            let { status, MpesaReceiptNumber, message } = snap.data();
            if (status !== "pending") {
              setDepositTransactionStatus({
                status,
                MpesaReceiptNumber,
                message,
              });
              unsub();
            }
          },
          (error) => {
            console.error(error);
          }
        );
    }
  }, [depositTransactionId]);

  const sendSTKPush = async () => {
    try {
      let response = await axios.post(SEND_STK_PUSH_URL, depositDetails);
      // Get mpesa transaction id
      let { transactionId } = response.data;
      setDepositTransactionId(transactionId);
      setSnackbar({
        message:
          "Enter your MPESA pin in the popup to complete the transaction",
        open: true,
        color: "info",
      });
    } catch (error) {
      console.error(error);
      if (error.response && error.response.status === 400) {
        // Request successful but server response wasn't in 2xx
        let { ResponseCode, ResponseDescription } = error.response.data;
        setSnackbar({
          message: `[${ResponseCode}] - ${ResponseDescription}. Please try again later`,
          open: true,
          color: "error",
        });
      } else {
        setSnackbar({
          message:
            "An error occurred while trying to bill the phone number. Please try again later",
          open: true,
          color: "error",
        });
      }
    }
  };

  const closeDepositDialog = () => {
    setDepositDialogOpen(false);
    // Reset deposit form
    setDepositDetails({ ...defaultDepositDetails });
    setDepositTransactionId("");
    setDepositTransactionStatus({ status: "" });
  };

  const classes = useStyles();

  return (
    <BaseDash>
      {group && (
        <>
          <AppBar
            component="div"
            className={classes.secondaryBar}
            color="primary"
            position="static"
          >
            <Typography variant="h5" component="h1" paragraph>
              {group.name}
            </Typography>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography align="center">
                <Avatar>
                  <People />
                </Avatar>
                {group.members.length} members
              </Typography>
              <Typography align="center">
                <Avatar>
                  <Money />
                </Avatar>
                KES. {group.monthlyContribution} monthly contribution
              </Typography>
              <Typography align="center">
                <Avatar>
                  <EventNote />
                </Avatar>
                Every {ordinalSuffix(group.meeting.dayRank)}{" "}
                {getDay(group.meeting.dayOfWeek)} of the month
              </Typography>
            </Box>
          </AppBar>
          <Box my="2em">
            <Card>
              <CardContent>
                <Typography variant="h6" component="h2">
                  My Contributions
                </Typography>
                <Grid container spacing={2}>
                  <Grid item sm={6}>
                    <Card>
                      <CardContent>
                        <Typography
                          style={{
                            textTransform: "uppercase",
                            fontWeight: "bold",
                          }}
                        >
                          This Month
                        </Typography>
                        <List>
                          <ListItem>
                            <ListItemIcon>
                              <LocalAtm />
                            </ListItemIcon>
                            <ListItemText
                              primary={"KES. " + group.monthlyContribution}
                              secondary="Monthly contribution due"
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemIcon>
                              <Payment />
                            </ListItemIcon>
                            <ListItemText
                              primary={"KES. 0"}
                              secondary="Outstanding loans"
                            />
                          </ListItem>
                        </List>
                        <Box display="flex" justifyContent="flex-end">
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={(e) => setDepositDialogOpen(true)}
                            disableElevation
                          >
                            Pay Dues
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item sm={6}>
                    <Card>
                      <CardContent>
                        <Typography
                          style={{
                            textTransform: "uppercase",
                            fontWeight: "bold",
                          }}
                        >
                          Lifetime
                        </Typography>
                        <List>
                          <ListItem>
                            <ListItemIcon>
                              <LocalAtm />
                            </ListItemIcon>
                            <ListItemText
                              primary={"KES. 0"}
                              secondary="Current blances"
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemIcon>
                              <Payment />
                            </ListItemIcon>
                            <ListItemText
                              primary={"KES. 0"}
                              secondary="Cash loaned out"
                            />
                          </ListItem>
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
                <Box my="1em">
                  <Divider light={true} />
                </Box>
                <Typography variant="h6" component="h2">
                  Transaction History
                </Typography>
                {groupTransactions.length > 0 ? (
                  <>
                    {groupTransactions.map((transaction, index) => (
                      <Box
                        key={index}
                        display="flex"
                        my="1em"
                        alignItems="center"
                      >
                        <Button
                          variant="contained"
                          size="small"
                          disableElevation
                        >
                          {format(
                            new Date(transaction.created_at),
                            "d LLL hh:mm a"
                          )}
                        </Button>
                        <Box flexGrow="1" ml="1em">
                          <Typography>
                            {paymentString(transaction, group.pubKey)}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </>
                ) : (
                  <Typography align="center">
                    No transactions have been performed on this group's wallet
                    yet
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>
        </>
      )}
      {!group && <Loader />}
      <Dialog
        open={depositDialogOpen}
        onClose={(e) => setDepositDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <AppBar
          color="secondary"
          position="sticky"
          elevation={0}
          style={{ padding: "1em" }}
        >
          <Typography
            style={{
              fontWeight: "bold",
            }}
          >
            Make Contribution
          </Typography>
        </AppBar>
        <DialogContent dividers={true}>
          {!depositTransactionId && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendSTKPush();
              }}
            >
              <Grid container spacing={2}>
                <Grid item sm={6}>
                  <TextField
                    label="Amount"
                    type="number"
                    variant="outlined"
                    margin="normal"
                    value={depositDetails.amount}
                    onChange={(e) =>
                      setDepositDetails({
                        ...depositDetails,
                        amount: Number(e.target.value),
                      })
                    }
                    fullWidth
                  />
                </Grid>
                <Grid item sm={6}>
                  <TextField
                    label="Phone Number"
                    type="tel"
                    variant="outlined"
                    margin="normal"
                    value={depositDetails.phoneNumber}
                    onChange={(e) =>
                      setDepositDetails({
                        ...depositDetails,
                        phoneNumber: e.target.value,
                      })
                    }
                    helperText="Safaricom number to be charged"
                    fullWidth
                  />
                </Grid>
              </Grid>
              <Box display="flex" mt="1em" justifyContent="flex-end">
                <Button
                  variant="contained"
                  color="primary"
                  size="medium"
                  type="submit"
                  disableElevation
                >
                  Make Deposit
                </Button>
              </Box>
            </form>
          )}
          {depositTransactionId && (
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
            >
              {depositTransactionStatus.status === "pending" && (
                <>
                  <Loader />
                  <Typography align="center">
                    Fetching transaction details...
                  </Typography>
                </>
              )}
              {depositTransactionStatus.status === "success" && (
                <>
                  <Avatar
                    style={{
                      backgroundColor: green["A400"],
                      height: "7em",
                      width: "7em",
                    }}
                  >
                    <DoneOutline style={{ fontSize: "5em" }} />
                  </Avatar>
                  <Typography align="center" paragraph>
                    Transaction Successful
                  </Typography>
                  <Box display="flex" justifyContent="end">
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={(e) => closeDepositDialog()}
                      disableElevation
                    >
                      Close
                    </Button>
                  </Box>
                </>
              )}
              {depositTransactionStatus.status === "failed" && (
                <>
                  <Avatar
                    style={{
                      backgroundColor: red["A400"],
                      height: "7em",
                      width: "7em",
                    }}
                  >
                    <ErrorOutline style={{ fontSize: "5em" }} />
                  </Avatar>
                  <Typography align="center">Transaction Failed</Typography>
                  <Typography
                    variant="caption"
                    align="center"
                    color="error"
                    paragraph
                  >
                    {depositTransactionStatus.message}
                  </Typography>
                  <Box display="flex" justifyContent="end">
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={(e) => closeDepositDialog()}
                      disableElevation
                    >
                      Close
                    </Button>
                  </Box>
                </>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </BaseDash>
  );
};

export default Group;
