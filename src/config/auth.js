function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 characters.");
  }

  return secret;
}

function getJwtVerifyOptions() {
  const options = {
    algorithms: ["HS256"],
  };

  if (process.env.JWT_ISSUER) {
    options.issuer = process.env.JWT_ISSUER;
  }

  return options;
}

module.exports = {
  getJwtSecret,
  getJwtVerifyOptions,
};
