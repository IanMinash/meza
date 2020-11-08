import { useState, useEffect, useContext } from "react";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Dialog,
  DialogContent,
  FormControl,
  FormHelperText,
  Grid,
  InputLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@material-ui/core";
import {
  Add,
  EventNote,
  LocalAtm,
  Money,
  Payment,
  People,
} from "@material-ui/icons";
import { useParams } from "react-router-dom";
import BaseDash, { useStyles } from "./BaseDash";
import Loader from "./Loader";
import Firebase from "../lib/firebase";
import { getDay, ordinalSuffix } from "../lib/dateHelpers";
import { SnackbarContext } from "../App";

const Group = () => {
  const user = Firebase.getCurrentUser();
  const { id } = useParams();
  const { setSnackbar } = useContext(SnackbarContext);

  const [group, setGroup] = useState(null);

  // Get the group
  useEffect(() => {
    (async () => {
      let group = await (
        await Firebase.firestore.doc(`groups/${id}`).get()
      ).data();
      setGroup(group);
    })();
  }, [id]);

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
                Ksh. {group.monthlyContribution} monthly contribution
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
                              primary={"Ksh. " + group.monthlyContribution}
                              secondary="Monthly contribution due"
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemIcon>
                              <Payment />
                            </ListItemIcon>
                            <ListItemText
                              primary={"Ksh. " + group.monthlyContribution}
                              secondary="Outstanding loans"
                            />
                          </ListItem>
                        </List>
                        <Box display="flex" justifyContent="flex-end">
                          <Button
                            variant="contained"
                            color="primary"
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
                              primary={"Ksh. " + group.monthlyContribution}
                              secondary="Current blances"
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemIcon>
                              <Payment />
                            </ListItemIcon>
                            <ListItemText
                              primary={"Ksh. " + group.monthlyContribution}
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
              </CardContent>
            </Card>
          </Box>
        </>
      )}
      {!group && <Loader />}
    </BaseDash>
  );
};

export default Group;
