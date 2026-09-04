const { body, param } = require("express-validator");

const widgetTypes = ["signup", "contact", "cta"];
const fieldTypes = ["text", "email"];

const widgetFieldsValidator = body("fields")
  .isArray({ min: 1, max: 20 })
  .withMessage("fields must contain between 1 and 20 items.")
  .custom((fields) => {
    const keys = new Set();

    fields.forEach((field) => {
      if (!field || typeof field !== "object" || Array.isArray(field)) {
        throw new Error("Each field must be an object.");
      }
      if (typeof field.key !== "string" || !/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(field.key)) {
        throw new Error("Each field key must be a valid identifier.");
      }
      if (keys.has(field.key)) {
        throw new Error("Field keys must be unique.");
      }
      keys.add(field.key);
      if (typeof field.label !== "string" || field.label.trim().length === 0 || field.label.length > 120) {
        throw new Error("Each field label is required and must be at most 120 characters.");
      }
      if (!fieldTypes.includes(field.type)) {
        throw new Error("Each field type must be text or email.");
      }
    });

    return true;
  });

const createWidgetValidator = [
  body("type").isIn(widgetTypes).withMessage("type must be signup, contact, or cta."),
  body("title").isString().trim().isLength({ min: 1, max: 160 }).withMessage("title is required and must be at most 160 characters."),
  body("description").optional({ nullable: true }).isString().isLength({ max: 1000 }),
  body("buttonText").optional().isString().trim().isLength({ min: 1, max: 80 }),
  body("displayOptions").optional().isObject().withMessage("displayOptions must be an object."),
  widgetFieldsValidator,
];

const updateWidgetValidator = [
  body("type").optional().isIn(widgetTypes).withMessage("type must be signup, contact, or cta."),
  body("title").optional().isString().trim().isLength({ min: 1, max: 160 }),
  body("description").optional({ nullable: true }).isString().isLength({ max: 1000 }),
  body("buttonText").optional().isString().trim().isLength({ min: 1, max: 80 }),
  body("displayOptions").optional().isObject().withMessage("displayOptions must be an object."),
  body("fields").optional(),
  body("fields").if(body("fields").exists()).isArray({ min: 1, max: 20 }).custom((fields) => {
    const keys = new Set();
    fields.forEach((field) => {
      if (!field || typeof field !== "object" || Array.isArray(field)
        || typeof field.key !== "string"
        || !/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(field.key)
        || keys.has(field.key)
        || typeof field.label !== "string"
        || field.label.trim().length === 0
        || field.label.length > 120
        || !fieldTypes.includes(field.type)) {
        throw new Error("Invalid widget field definition.");
      }
      keys.add(field.key);
    });
    return true;
  }),
];

const widgetIdValidator = [
  param("id").isUUID().withMessage("id must be a valid widget ID."),
];

module.exports = {
  createWidgetValidator,
  updateWidgetValidator,
  widgetIdValidator,
};
