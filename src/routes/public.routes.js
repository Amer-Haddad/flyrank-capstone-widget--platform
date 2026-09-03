const { Router } = require("express");
const cors = require("cors");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const publicSubmissionsController = require("../controllers/public-submissions.controller");
const { validateRequest } = require("../middleware/validate-request");
const { createSubmissionValidator } = require("../validators/public-submissions.validator");

const router = Router();

const submissionsCors = cors({
  origin: true,
  methods: ["POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
});

function getClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
     return forwardedFor.split(",")[0].trim();
  }

  return ipKeyGenerator(req);
}

const publicSubmissionIpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  handler: (_req, res) => {
     res.status(429).json({
        success: false,
        error: {
           code: "RATE_LIMITED",
           message: "Too many submission attempts. Please try again shortly.",
           details: [],
        },
     });
  },
});

const publicSubmissionWidgetLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
     const widgetId = req.body && typeof req.body.widgetId === "string" ? req.body.widgetId : "unknown";
     return `${getClientIp(req)}:${widgetId}`;
  },
  handler: (_req, res) => {
     res.status(429).json({
        success: false,
        error: {
           code: "RATE_LIMITED",
           message: "This widget is temporarily rate-limited.",
           details: [],
        },
     });
  },
});

router.options("/submissions", submissionsCors, (_req, res) => {
  return res.sendStatus(204);
});

router.post(
  "/submissions",
  submissionsCors,
  publicSubmissionIpLimiter,
  publicSubmissionWidgetLimiter,
  createSubmissionValidator,
  validateRequest,
  publicSubmissionsController.createSubmission,
);

module.exports = router;
