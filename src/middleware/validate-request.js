const { validationResult } = require("express-validator");
const { HttpError } = require("../utils/http-error");

function validateRequest(req, _res, next) {
  const result = validationResult(req);

  if (!result.isEmpty()) {
    return next(
      new HttpError(400, "VALIDATION_ERROR", "Payload validation failed.", result.array()),
    );
  }

  return next();
}

module.exports = {
  validateRequest,
};
