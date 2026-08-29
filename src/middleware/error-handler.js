function notFoundHandler(_req, res) {
  return res.status(404).json({
    error: "Not Found",
    message: "Route does not exist.",
  });
}

function errorHandler(error, _req, res, _next) {
  const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
  const message = error.message || "Internal Server Error";

  if (statusCode >= 500) {
    console.error(error);
  }

  return res.status(statusCode).json({
    error: "Request Failed",
    message,
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
