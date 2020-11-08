import { useState, useEffect, useContext } from "react";
import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
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
import { Add, EventNote, People } from "@material-ui/icons";
import { TimePicker } from "@material-ui/pickers";
import BaseDash, { useStyles } from "./BaseDash";
import Firebase from "../lib/firebase";
import { getDay, ordinalSuffix } from "../lib/dateHelpers";
import { SnackbarContext } from "../App";

const Home = () => {
  const user = Firebase.getCurrentUser();
  const { setSnackbar } = useContext(SnackbarContext);

  const defaultGroupDetails = {
    name: "",
    meeting: {
      dayRank: undefined,
      dayOfWeek: undefined,
      time: undefined,
      datetime: undefined,
    },
    monthlyContibution: undefined,
    interestRate: 10,
    members: [user.uid],
    admins: [user.uid],
  };

  const [groupId, setGroupId] = useState("");

  const [savingsGroups, setSavingsGroups] = useState([]);

  const [createOrJoinDialogOpen, setCreateOrJoinDialogOpen] = useState(false);
  const [groupCreatedOrJoined, setGroupCreatedOrJoined] = useState(0);
  const [dialogPage, setDialogPage] = useState(0);

  const [groupDetails, setGroupDetails] = useState(defaultGroupDetails);

  // Get user groups
  useEffect(() => {
    (async () => {
      let userGroups = await Firebase.getAllDocs("groups", {
        attribute: "members",
        comparator: "array-contains",
        value: user.uid,
      });
      setSavingsGroups(userGroups);
    })();
  }, [user, groupCreatedOrJoined]);

  const createGroup = async () => {
    try {
      await Firebase.createDoc("groups", groupDetails);
      setCreateOrJoinDialogOpen(false);
      setGroupDetails(defaultGroupDetails);
      setGroupCreatedOrJoined(groupCreatedOrJoined + 1);
      setSnackbar({
        message: "Savings group created successfully!",
        open: true,
        color: "success",
      });
    } catch (error) {
      console.error(error);
    }
  };

  const joinGroup = async () => {
    try {
      await Firebase.updateDoc("groups", `${groupId}`, {
        members: Firebase.firestoreRaw.FieldValue.arrayUnion(user.uid),
      });
      setCreateOrJoinDialogOpen(false);
      setGroupId("");
      setGroupCreatedOrJoined(groupCreatedOrJoined + 1);
      setSnackbar({
        message: "Joined savings group successfully!",
        open: true,
        color: "success",
      });
    } catch (error) {
      console.error(error);
      setSnackbar({
        message:
          "Could not join group, please check that you've entered the right Group Code.",
        open: true,
        color: "error",
      });
    }
  };

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
          Hi {user.displayName}!
        </Typography>
      </AppBar>
      <Box my="2em">
        <Grid container spacing={2}>
          {savingsGroups.map((group, index) => (
            <Grid item md={4} key={index}>
              <Card>
                <CardContent>
                  <Typography variant="h6">{group.name}</Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <People />
                      </ListItemIcon>
                      <ListItemText>
                        {group.members.length} members
                      </ListItemText>
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <EventNote />
                      </ListItemIcon>
                      <ListItemText>
                        Every {ordinalSuffix(group.meeting.dayRank)}{" "}
                        {getDay(group.meeting.dayOfWeek)} of the month at{" "}
                        {group.meeting.time}
                      </ListItemText>
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          ))}
          <Grid item md={4}>
            <Card>
              <CardContent
                style={{ cursor: "pointer" }}
                onClick={(e) => setCreateOrJoinDialogOpen(true)}
              >
                <Box textAlign="center" fontSize="6em">
                  <Add fontSize="inherit" />
                </Box>
                <Typography align="center">Create or join a group</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
      <Dialog
        open={createOrJoinDialogOpen}
        onClose={(e) => setCreateOrJoinDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <AppBar color="secondary" position="sticky" elevation={0}>
          <Tabs
            value={dialogPage}
            onChange={(e, newPage) => setDialogPage(newPage)}
            centered
          >
            <Tab label="Create Group" />
            <Tab label="Join Group" />
          </Tabs>
        </AppBar>
        <DialogContent dividers={true}>
          {dialogPage === 0 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createGroup();
              }}
            >
              <Typography>Group Info</Typography>
              <TextField
                type="text"
                label="Group Name"
                variant="outlined"
                margin="normal"
                value={groupDetails.name}
                onChange={(e) =>
                  setGroupDetails({ ...groupDetails, name: e.target.value })
                }
                required
                fullWidth
              />
              <Typography>We meet on:</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={2}>
                  <FormControl variant="outlined" fullWidth>
                    <InputLabel>Every</InputLabel>
                    <Select
                      value={groupDetails.meeting.dayRank}
                      onChange={(e) =>
                        setGroupDetails({
                          ...groupDetails,
                          meeting: {
                            ...groupDetails.meeting,
                            dayRank: e.target.value,
                          },
                        })
                      }
                      required
                    >
                      <MenuItem value={1}>1st</MenuItem>
                      <MenuItem value={2}>2nd</MenuItem>
                      <MenuItem value={3}>3rd</MenuItem>
                      <MenuItem value={4}>4th</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <FormControl variant="outlined" fullWidth>
                    <InputLabel>Day of Week</InputLabel>
                    <Select
                      value={groupDetails.meeting.dayOfWeek}
                      onChange={(e) =>
                        setGroupDetails({
                          ...groupDetails,
                          meeting: {
                            ...groupDetails.meeting,
                            dayOfWeek: e.target.value,
                          },
                        })
                      }
                      required
                    >
                      <MenuItem value={0}>Sunday</MenuItem>
                      <MenuItem value={1}>Monday</MenuItem>
                      <MenuItem value={2}>Tuesday</MenuItem>
                      <MenuItem value={3}>Wednesday</MenuItem>
                      <MenuItem value={4}>Thursday</MenuItem>
                      <MenuItem value={5}>Friday</MenuItem>
                      <MenuItem value={6}>Saturday</MenuItem>
                    </Select>
                    <FormHelperText>of the month</FormHelperText>
                  </FormControl>
                </Grid>
                <Grid item sm={6}>
                  <TimePicker
                    label="Time"
                    inputVariant="outlined"
                    value={groupDetails.meeting.datetime}
                    onChange={(time) => {
                      time.setSeconds(0);
                      setGroupDetails({
                        ...groupDetails,
                        meeting: {
                          ...groupDetails.meeting,
                          time: time.toTimeString(),
                          datetime: time,
                        },
                      });
                    }}
                    required
                    fullWidth
                  />
                </Grid>
                <Grid item sm={6}>
                  <TextField
                    type="number"
                    label="Monthly Contribution"
                    helperText="Amount people should contribute in each meeting"
                    variant="outlined"
                    value={groupDetails.monthlyContibution}
                    onChange={(e) =>
                      setGroupDetails({
                        ...groupDetails,
                        monthlyContibution: e.target.value,
                      })
                    }
                    required
                    fullWidth
                  />
                </Grid>
                <Grid item sm={6}>
                  <TextField
                    type="number"
                    min="0"
                    label="Interest rate"
                    helperText="Interest rate applied for borrowed loans each month"
                    variant="outlined"
                    value={groupDetails.interestRate}
                    onChange={(e) =>
                      setGroupDetails({
                        ...groupDetails,
                        interestRate: e.target.value,
                      })
                    }
                    required
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
                  Create Group
                </Button>
              </Box>
            </form>
          )}
          {dialogPage === 1 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                joinGroup();
              }}
            >
              <TextField
                variant="outlined"
                label="Group Code"
                inputProps={{
                  minlength: "6",
                  maxlength: "6",
                  style: {
                    textTransform: "uppercase",
                    letterSpacing: "0.3em",
                    fontWeight: "bold",
                  },
                }}
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                required
                fullWidth
              />
              <Box display="flex" mt="1em" justifyContent="flex-end">
                <Button
                  variant="contained"
                  color="primary"
                  type="submit"
                  disableElevation
                >
                  Join Group
                </Button>
              </Box>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </BaseDash>
  );
};

export default Home;
