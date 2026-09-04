const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const authRepository = require("../repositories/auth.repository");
const { getJwtSecret } = require("../config/auth");

function createAccessToken(user, tenant) {
  const claims = {
    sub: user.id,
    tenantId: tenant.id,
    role: user.role,
  };
  const options = {
    algorithm: "HS256",
    expiresIn: "1h",
  };

  if (process.env.JWT_ISSUER) {
    options.issuer = process.env.JWT_ISSUER;
  }

  return jwt.sign(claims, getJwtSecret(), options);
}

async function registerOwner({ tenantName, tenantSlug, email, password }) {
  const passwordHash = await bcrypt.hash(password, 12);
  let result;
  try {
    result = await authRepository.registerOwner({
      tenantName,
      tenantSlug,
      email,
      passwordHash,
    });
  } catch (error) {
    if (error.code === "23505") {
      error.statusCode = 409;
      error.code = "REGISTRATION_CONFLICT";
      error.message = "The tenant slug or account already exists.";
    }
    throw error;
  }

  return {
    token: createAccessToken(result.user, result.tenant),
    user: {
      id: result.user.id,
      email: result.user.email,
      role: result.user.role,
    },
    tenant: result.tenant,
  };
}

module.exports = {
  registerOwner,
};
