const submissionsRepository = require("../repositories/public-submissions.repository");
const { resolveGeoForIp } = require("./geo-enrichment.service");
const { enqueueSubmissionSideEffects } = require("./submission-side-effects.service");
const { HttpError } = require("../utils/http-error");

function getRequestIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.ip || null;
}

async function createSubmission({ widgetId, payload, req }) {
  if (!widgetId || typeof widgetId !== "string") {
    throw new HttpError(400, "INVALID_WIDGET_ID", "widgetId is required.");
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload) || Object.keys(payload).length === 0) {
    throw new HttpError(400, "INVALID_PAYLOAD", "payload must be a non-empty object.");
  }

  const widget = await submissionsRepository.findWidgetById(widgetId);

  if (!widget) {
    throw new HttpError(404, "WIDGET_NOT_FOUND", "Widget does not exist.");
  }

  if (!widget.is_active) {
    throw new HttpError(403, "WIDGET_INACTIVE", "Widget is inactive.");
  }

  const ipAddress = getRequestIp(req);
  const geo = await resolveGeoForIp(ipAddress);

  const submission = await submissionsRepository.insertSubmission({
    widgetId: widget.id,
    tenantId: widget.tenant_id,
    payload,
    ip: ipAddress,
    userAgent: req.headers["user-agent"] || null,
    geo,
  });

  enqueueSubmissionSideEffects({
    submissionId: submission.id,
    widgetId: submission.widget_id,
    tenantId: submission.tenant_id,
    payload,
    ip: ipAddress,
    userAgent: req.headers["user-agent"] || null,
  });

  return submission;
}

module.exports = {
  createSubmission,
};
