const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");

const app = express();

// Serve the standalone HTML/CSS/Canvas app from /app.
app.use(express.static(path.join(__dirname, "..", "app")));

module.exports = app;
