import React from "react";
import clsx from "clsx";
import { Link } from "react-router-dom";
import { makeStyles } from "@material-ui/core/styles";
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@material-ui/core";
import { AccountBox, Home } from "@material-ui/icons";
import { useLocation } from "react-router-dom";

const pages = [
  {
    name: "Home",
    link: "/",
    icon: <Home />,
  },
  {
    name: "Account Settings",
    link: "/account-settings",
    icon: <AccountBox />,
  },
];

const useStyles = makeStyles((theme) => ({
  categoryHeader: {
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(2),
  },
  categoryHeaderPrimary: {
    color: theme.palette.common.white,
  },
  item: {
    paddingTop: 1,
    paddingBottom: 1,
    color: "rgba(255, 255, 255, 0.7)",
    "&:hover,&:focus": {
      backgroundColor: "rgba(255, 255, 255, 0.08)",
    },
    textDecoration: "none",
  },
  itemCategory: {
    backgroundColor: "#232f3e",
    boxShadow: "0 -1px 0 #404854 inset",
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(2),
  },
  logo: {
    fontSize: 24,
    color: theme.palette.common.white,
  },
  itemActiveItem: {
    color: "#4fc3f7",
  },
  itemPrimary: {
    fontSize: "inherit",
  },
  itemIcon: {
    minWidth: "auto",
    marginRight: theme.spacing(2),
  },
  divider: {
    marginTop: theme.spacing(2),
  },
}));

const DashLinks = (props) => {
  const classes = useStyles();
  const location = useLocation();
  const { ...other } = props;

  return (
    <Drawer variant="permanent" {...other}>
      <List disablePadding>
        <ListItem
          className={clsx(classes.logo, classes.item, classes.itemCategory)}
        >
          <Typography variant="h4">MEZA</Typography>
        </ListItem>
        {pages.map((page, id) => (
          <Link
            key={id}
            to={page.link}
            className={clsx(
              classes.item,
              location.pathname == page.link && classes.itemActiveItem
            )}
          >
            <ListItem button>
              <ListItemIcon className={classes.itemIcon}>
                {page.icon}
              </ListItemIcon>
              <ListItemText
                classes={{
                  primary: classes.itemPrimary,
                }}
              >
                {page.name}
              </ListItemText>
            </ListItem>
          </Link>
        ))}
      </List>
    </Drawer>
  );
};

export default DashLinks;
