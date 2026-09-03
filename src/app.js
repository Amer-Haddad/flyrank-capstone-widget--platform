const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");

const apiRoutes = require("./routes");
const publicWidgetsController = require("./controllers/public-widgets.controller");
const { notFoundHandler, errorHandler } = require("./middleware/error-handler");

const app = express();

app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: "64kb" }));
app.use(express.urlencoded({ extended: true, limit: "64kb" }));

app.get("/widget.js", publicWidgetsController.serveWidgetScript);
app.use("/api", apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
