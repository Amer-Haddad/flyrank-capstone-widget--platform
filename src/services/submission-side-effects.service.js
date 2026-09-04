const nodemailer = require("nodemailer");
const submissionsRepository = require("../repositories/public-submissions.repository");
const { enqueueJob, registerJob } = require("../jobs");

const SUBMISSION_SIDE_EFFECTS_JOB = "submission-side-effects";

const DEFAULT_EMAIL_RECIPIENT = "your-recipient@example.com";

function getRecipientEmail() {
  return process.env.TEST_EMAIL || process.env.NOTIFICATION_EMAIL || DEFAULT_EMAIL_RECIPIENT;
}

function getSenderEmail() {
  return process.env.MAIL_FROM || process.env.SMTP_USER || "your-sender@gmail.com";
}

function createSmtpTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP configuration is incomplete.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
    auth: {
      user,
      pass,
    },
  });
}

function normalizeMetadata(payload) {
  return {
    widgetId: payload.widgetId || null,
    tenantId: payload.tenantId || null,
    submissionId: payload.submissionId || null,
    source: payload.source || "public-submission",
  };
}

async function sendSubmissionEmail({ submissionId, widgetId, tenantId, payload, ip, userAgent }) {
  const recipientEmail = getRecipientEmail();
  const emailBody = [
    "FlyRank submission received.",
    `Submission ID: ${submissionId}`,
    `Widget ID: ${widgetId}`,
    `Tenant ID: ${tenantId}`,
    `IP: ${ip || "unknown"}`,
    `User-Agent: ${userAgent || "unknown"}`,
    "",
    "Payload:",
    JSON.stringify(payload, null, 2),
  ].join("\n");

  const emailPayload = {
    to: recipientEmail,
    from: getSenderEmail(),
    subject: `New widget submission: ${widgetId}`,
    text: emailBody,
  };

  if (process.env.MAILER_MODE === "mock") {
    console.log(`[email] mock send to ${recipientEmail}: ${emailPayload.subject}`);
    return { accepted: true, recipientEmail };
  }

  if (process.env.MAILER_MODE === "smtp") {
    const transporter = createSmtpTransport();
    const info = await transporter.sendMail(emailPayload);
    return { accepted: true, recipientEmail, messageId: info.messageId };
  }

  if (typeof globalThis.fetch === "function") {
    const response = await globalThis.fetch(process.env.EMAIL_WEBHOOK_URL || "http://localhost:3001/mock-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    if (!response.ok) {
      throw new Error(`Email provider returned status ${response.status}.`);
    }

    return { accepted: true, recipientEmail };
  }

  console.log(`[email] simulated send to ${recipientEmail}: ${emailPayload.subject}`);
  return { accepted: true, recipientEmail };
}

async function recordEventFailure({ submissionId, tenantId, error }) {
  await submissionsRepository.insertSubmissionEvent({
    submissionId,
    tenantId,
    eventType: "email_notification",
    eventStatus: "failed",
    attemptCount: 1,
    errorMessage: error.message,
    metadata: { provider: process.env.EMAIL_PROVIDER || "mock" },
  });
}

async function processSubmissionSideEffects({ submissionId, widgetId, tenantId, payload, ip, userAgent }) {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await sendSubmissionEmail({
        submissionId,
        widgetId,
        tenantId,
        payload,
        ip,
        userAgent,
      });

      await submissionsRepository.insertSubmissionEvent({
        submissionId,
        tenantId,
        eventType: "email_notification",
        eventStatus: "sent",
        attemptCount: attempt,
        errorMessage: null,
        metadata: normalizeMetadata({
          widgetId,
          tenantId,
          submissionId,
          source: "public-submission",
        }),
      });

      return;
    } catch (error) {
      if (attempt === maxAttempts) {
        await recordEventFailure({ submissionId, tenantId, error });
        console.error(`[email] failed after ${maxAttempts} attempts for submission ${submissionId}:`, error.message);
        return;
      }
    }
  }
}

function enqueueSubmissionSideEffects(submission) {
  enqueueJob(SUBMISSION_SIDE_EFFECTS_JOB, submission);
}

registerJob(SUBMISSION_SIDE_EFFECTS_JOB, processSubmissionSideEffects);

module.exports = {
  sendSubmissionEmail,
  processSubmissionSideEffects,
  enqueueSubmissionSideEffects,
  getRecipientEmail,
};
