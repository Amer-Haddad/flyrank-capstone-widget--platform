const { Router } = require("express");
const cors = require("cors");

const healthController = require("../controllers/health.controller");
const authController = require("../controllers/auth.controller");
const dashboardController = require("../controllers/dashboard.controller");
const publicRoutes = require("./public.routes");
const widgetsController = require("../controllers/widgets.controller");
const { authenticateOwner } = require("../middleware/authenticate-owner");
const { requireTenantContext } = require("../middleware/require-tenant-context");
const { validateRequest } = require("../middleware/validate-request");
const { createWidgetValidator, updateWidgetValidator, widgetIdValidator } = require("../validators/widgets.validator");
const { registerValidator } = require("../validators/auth.validator");

const router = Router();
router.use(cors({
  origin: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Accept", "Authorization", "Idempotency-Key"],
  credentials: false,
}));
const registrationCors = cors({
  origin: true,
  methods: ["POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Accept"],
  credentials: false,
});

router.get("/health", healthController.getHealth);
router.options("/auth/register", registrationCors, (_req, res) => res.sendStatus(204));
router.post("/auth/register", registrationCors, registerValidator, validateRequest, authController.register);
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
