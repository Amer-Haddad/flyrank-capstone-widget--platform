const { Router } = require("express");

const healthController = require("../controllers/health.controller");
const dashboardController = require("../controllers/dashboard.controller");
const publicRoutes = require("./public.routes");
const widgetsController = require("../controllers/widgets.controller");
const { authenticateOwner } = require("../middleware/authenticate-owner");
const { requireTenantContext } = require("../middleware/require-tenant-context");
const { validateRequest } = require("../middleware/validate-request");
const { createWidgetValidator, updateWidgetValidator, widgetIdValidator } = require("../validators/widgets.validator");

const router = Router();

router.get("/health", healthController.getHealth);
router.use("/public", publicRoutes);
router.use("/widgets", authenticateOwner, requireTenantContext);
router.post("/widgets", createWidgetValidator, validateRequest, widgetsController.createWidget);
router.get("/widgets", widgetsController.listWidgets);
router.get("/widgets/:id", widgetIdValidator, validateRequest, widgetsController.getWidget);
router.patch("/widgets/:id", widgetIdValidator, updateWidgetValidator, validateRequest, widgetsController.updateWidget);
router.delete("/widgets/:id", widgetIdValidator, validateRequest, widgetsController.deleteWidget);
router.get("/dashboard/submissions", authenticateOwner, requireTenantContext, dashboardController.listSubmissions);
router.get("/dashboard/stats/overview", authenticateOwner, requireTenantContext, dashboardController.getOverview);
router.get("/dashboard/stats/widgets", authenticateOwner, requireTenantContext, dashboardController.getWidgetStats);
router.get("/dashboard/stats/geo", authenticateOwner, requireTenantContext, dashboardController.getGeoStats);

module.exports = router;
