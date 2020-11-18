import { useState } from "react";
import {
  Hidden,
  AppBar,
  Avatar,
  Grid,
  Toolbar,
  IconButton,
  Tooltip,
  Button,
} from "@material-ui/core";
import { AccountBalance, Menu, Notifications } from "@material-ui/icons";
import { makeStyles } from "@material-ui/core/styles";
import DashLinks from "./DashLinks";
import Firebase from "../lib/firebase";

const drawerWidth = 256;

const lightColor = "rgba(255, 255, 255, 0.7)";

export const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    minHeight: "100vh",
  },
  drawer: {
    [theme.breakpoints.up("sm")]: {
      width: drawerWidth,
      flexShrink: 0,
    },
  },
  app: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  main: {
    flex: 1,
    padding: theme.spacing(6, 4),
    background: "#eaeff1",
  },
  footer: {
    padding: theme.spacing(2),
    background: "#eaeff1",
  },
  secondaryBar: {
    padding: "0.5em 1em",
    borderRadius: "8px",
  },
  menuButton: {
    marginLeft: -theme.spacing(1),
  },
  iconButtonAvatar: {
    padding: 4,
  },
  link: {
    textDecoration: "none",
    color: lightColor,
    "&:hover": {
      color: theme.palette.common.white,
    },
  },
  button: {
    borderColor: lightColor,
  },
}));

const Header = (props) => {
  const { onDrawerToggle } = props;
  const classes = useStyles();
  const user = Firebase.getCurrentUser();

  return (
    <>
      <AppBar color="primary" position="sticky" elevation={0}>
        <Toolbar>
          <Grid container spacing={1} alignItems="center">
            <Hidden smUp>
              <Grid item>
                <IconButton
                  color="inherit"
                  aria-label="open drawer"
                  onClick={onDrawerToggle}
                  className={classes.menuButton}
                >
                  <Menu />
                </IconButton>
              </Grid>
            </Hidden>
            <Grid item xs />
            <Grid item>
              <Tooltip title="Account Balance">
                <Button
                  variant="outlined"
                  startIcon={<AccountBalance />}
                  color="inherit"
                >
                  {Number(0).toFixed(2).toLocaleString()}
                </Button>
              </Tooltip>
            </Grid>
            <Grid item>
              <Tooltip title="Alerts • No alerts">
                <IconButton color="inherit">
                  <Notifications />
                </IconButton>
              </Tooltip>
            </Grid>
            <Grid item>
              <IconButton color="inherit" className={classes.iconButtonAvatar}>
                <Avatar src={user.photoURL} alt="My Avatar" />
              </IconButton>
            </Grid>
          </Grid>
        </Toolbar>
      </AppBar>
    </>
  );
};

const BaseDash = ({ children }) => {
  const classes = useStyles();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <div className={classes.root}>
      <nav className={classes.drawer}>
        <Hidden smUp implementation="js">
          <DashLinks
            PaperProps={{ style: { width: drawerWidth } }}
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
          />
        </Hidden>
        <Hidden xsDown implementation="css">
          <DashLinks PaperProps={{ style: { width: drawerWidth } }} />
        </Hidden>
      </nav>
      <div className={classes.app}>
        <Header onDrawerToggle={handleDrawerToggle} />
        <main className={classes.main}>{children}</main>
      </div>
    </div>
  );
};

export default BaseDash;
