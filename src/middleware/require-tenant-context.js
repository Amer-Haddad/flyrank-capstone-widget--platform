const { HttpError } = require("../utils/http-error");

function requireTenantContext(req, _res, next) {
  if (!req.owner || typeof req.owner.tenantId !== "string" || req.owner.tenantId.length === 0) {
    return next(new HttpError(401, "UNAUTHORIZED", "Authenticated tenant context is required."));
  }

  req.tenant = {
    id: req.owner.tenantId,
    userId: req.owner.userId,
  };

  return next();
}

module.exports = {
  requireTenantContext,
};
