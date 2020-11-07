import { createMuiTheme, responsiveFontSizes } from "@material-ui/core/styles";
// Create a theme instance.

let theme = createMuiTheme({
  palette: {
    primary: {
      light: "#63ccff",
      main: "#039BE5",
      dark: "#006db3",
    },
    secondary: {
      main: "#2C384A",
    },
  },
  typography: {
    useNextVariants: true,
    fontFamily: `'PT Sans', sans-serif`,
    button: {
      fontFamily: `'Montserrat', 'Helvetica', sans-serif`,
      fontWeight: "bolder",
    },
    h1: {
      fontFamily: `'Montserrat', 'Helvetica', sans-serif`,
    },
    h2: {
      fontFamily: `'Montserrat', 'Helvetica', sans-serif`,
    },
    h3: {
      fontFamily: `'Montserrat', 'Helvetica', sans-serif`,
    },
    h4: {
      fontFamily: `'Montserrat', 'Helvetica', sans-serif`,
    },
    h5: {
      fontFamily: `'Montserrat', 'Helvetica', sans-serif`,
    },
    h6: {
      fontFamily: `'Montserrat', 'Helvetica', sans-serif`,
    },
  },
});

theme = {
  ...theme,
  overrides: {
    MuiDrawer: {
      paper: {
        backgroundColor: "#18202c",
      },
    },
    MuiTabs: {
      root: {
        marginLeft: theme.spacing(1),
      },
      indicator: {
        height: 3,
        borderTopLeftRadius: 3,
        borderTopRightRadius: 3,
        backgroundColor: theme.palette.common.white,
      },
    },
    MuiTab: {
      root: {
        textTransform: "none",
        margin: "0 16px",
        minWidth: 0,
        padding: 0,
        [theme.breakpoints.up("md")]: {
          padding: 0,
          minWidth: 0,
        },
      },
    },
    MuiIconButton: {
      root: {
        padding: theme.spacing(1),
      },
    },
    MuiTooltip: {
      tooltip: {
        borderRadius: 4,
      },
    },
    MuiDivider: {
      root: {
        backgroundColor: "#404854",
      },
    },
    MuiListItemText: {
      primary: {
        fontWeight: theme.typography.fontWeightMedium,
      },
    },
    MuiListItemIcon: {
      root: {
        color: "inherit",
        marginRight: 0,
        "& svg": {
          fontSize: 20,
        },
      },
    },
    MuiAvatar: {
      root: {
        width: 32,
        height: 32,
      },
    },
    MuiCard: {
      root: {
        borderRadius: "8px",
      },
    },
  },
};

export default responsiveFontSizes(theme);
