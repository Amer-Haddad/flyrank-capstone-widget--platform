const { Router } = require("express");

const healthController = require("../controllers/health.controller");
const publicRoutes = require("./public.routes");

const router = Router();

router.get("/health", healthController.getHealth);
router.use("/public", publicRoutes);

module.exports = router;
