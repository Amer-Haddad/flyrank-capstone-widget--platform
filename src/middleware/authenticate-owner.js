const jwt = require("jsonwebtoken");

const { getJwtSecret, getJwtVerifyOptions } = require("../config/auth");
const { HttpError } = require("../utils/http-error");

function authenticateOwner(req, _res, next) {
  const authorization = req.get("authorization");

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return next(new HttpError(401, "UNAUTHORIZED", "Authentication is required."));
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (!token) {
    return next(new HttpError(401, "UNAUTHORIZED", "Authentication is required."));
  }

  try {
    const claims = jwt.verify(token, getJwtSecret(), getJwtVerifyOptions());
    const userId = claims.sub || claims.userId;
    const tenantId = claims.tenantId;

    if (typeof userId !== "string" || typeof tenantId !== "string") {
      return next(new HttpError(401, "UNAUTHORIZED", "Token is missing required owner claims."));
    }

    req.owner = {
      userId,
      tenantId,
      role: typeof claims.role === "string" ? claims.role : "owner",
    };

    return next();
  } catch (_error) {
    return next(new HttpError(401, "UNAUTHORIZED", "Authentication token is invalid or expired."));
  }
}

module.exports = {
  authenticateOwner,
};
