const { body } = require("express-validator");

const registerValidator = [
  body("tenantName")
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage("tenantName must be between 2 and 120 characters."),
  body("tenantSlug")
    .trim()
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .isLength({ min: 2, max: 63 })
    .withMessage("tenantSlug must contain lowercase letters, numbers, and hyphens."),
  body("email")
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage("email must be valid."),
  body("password")
    .isString()
    .isLength({ min: 12, max: 128 })
    .withMessage("password must be between 12 and 128 characters."),
];

module.exports = {
  registerValidator,
};
