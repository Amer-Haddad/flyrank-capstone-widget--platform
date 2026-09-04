const { Router } = require("express");

const healthController = require("../controllers/health.controller");
const publicRoutes = require("./public.routes");
const widgetsController = require("../controllers/widgets.controller");
const { authenticateOwner } = require("../middleware/authenticate-owner");
const { requireTenantContext } = require("../middleware/require-tenant-context");
const { validateRequest } = require("../middleware/validate-request");
const { createWidgetValidator, widgetIdValidator } = require("../validators/widgets.validator");

const router = Router();

router.get("/health", healthController.getHealth);
router.use("/public", publicRoutes);
router.use("/widgets", authenticateOwner, requireTenantContext);
router.post("/widgets", createWidgetValidator, validateRequest, widgetsController.createWidget);
router.get("/widgets", widgetsController.listWidgets);
router.get("/widgets/:id", widgetIdValidator, validateRequest, widgetsController.getWidget);

module.exports = router;
