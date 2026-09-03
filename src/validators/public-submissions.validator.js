const { body } = require("express-validator");

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const createSubmissionValidator = [
  body("widgetId")
    .trim()
    .notEmpty()
    .withMessage("widgetId is required.")
    .bail()
    .isUUID()
    .withMessage("widgetId must be a valid UUID."),
  body("payload")
    .exists({ values: "falsy" })
    .withMessage("payload is required.")
    .bail()
    .custom((value) => {
      if (!isPlainObject(value)) {
        throw new Error("payload must be an object.");
      }

      const entries = Object.entries(value);

      if (entries.length === 0) {
        throw new Error("payload must contain at least one field.");
      }

      if (entries.length > 25) {
        throw new Error("payload contains too many fields.");
      }

      for (const [key, entryValue] of entries) {
        if (key.length > 64) {
          throw new Error(`Field "${key}" exceeds the allowed length.`);
        }

        if (entryValue === null || entryValue === undefined) {
          continue;
        }

        if (typeof entryValue === "string") {
          if (entryValue.length > 2000) {
            throw new Error(`Field "${key}" exceeds the maximum length.`);
          }
          continue;
        }

        if (typeof entryValue === "number") {
          if (!Number.isFinite(entryValue)) {
            throw new Error(`Field "${key}" must be a valid number.`);
          }
          continue;
        }

        if (typeof entryValue === "boolean") {
          continue;
        }

        throw new Error(`Field "${key}" must be a string, number, or boolean.`);
      }

      return true;
    })
    .withMessage("payload is invalid."),
  body("website")
    .optional({ values: "falsy" })
    .custom((value) => {
      if (typeof value === "string" && value.trim().length > 0) {
        throw new Error("Spam check failed.");
      }
      return true;
    })
    .withMessage("Spam check failed."),
  body("company")
    .optional({ values: "falsy" })
    .custom((value) => {
      if (typeof value === "string" && value.trim().length > 0) {
        throw new Error("Spam check failed.");
      }
      return true;
    })
    .withMessage("Spam check failed."),
];

module.exports = {
  createSubmissionValidator,
};
