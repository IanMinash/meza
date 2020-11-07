import React from "react";
import { CircularProgress, Grid } from "@material-ui/core";

const Loader = () => (
  <Grid container justify="center">
    <CircularProgress color="secondary" />
  </Grid>
);

export default Loader;
