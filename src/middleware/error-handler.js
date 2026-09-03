function notFoundHandler(_req, res) {
  return res.status(404).json({
    success: false,
    error: {
      code: "ROUTE_NOT_FOUND",
      message: "Route does not exist.",
      details: [],
    },
  });
}

function errorHandler(error, _req, res, _next) {
  let statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
  let code = error.code || "INTERNAL_ERROR";
  let message = error.message || "Internal Server Error";
  let details = Array.isArray(error.details) ? error.details : [];

  if (error.type === "entity.too.large") {
    statusCode = 413;
    code = "PAYLOAD_TOO_LARGE";
    message = "Payload is too large.";
    details = [];
  }

  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    statusCode = 400;
    code = "INVALID_JSON";
    message = "Request body must be valid JSON.";
    details = [];
  }

  if (statusCode >= 500) {
    console.error(error);
  }

  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details,
    },
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
