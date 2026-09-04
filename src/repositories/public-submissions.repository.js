const { pool } = require("../database/pool");

async function findWidgetById(widgetId) {
  const query = `
    SELECT id, tenant_id, is_active
    FROM widgets
    WHERE id = $1
    LIMIT 1;
  `;

  const result = await pool.query(query, [widgetId]);
  return result.rows[0] || null;
}

async function insertSubmission({ widgetId, tenantId, payload, ip, userAgent, geo }) {
  const query = `
    INSERT INTO submissions (widget_id, tenant_id, payload, ip, user_agent, geo, status)
    VALUES ($1, $2, $3::jsonb, $4, $5, $6::jsonb, 'received')
    RETURNING id, widget_id, tenant_id, status, created_at, geo;
  `;

  const values = [widgetId, tenantId, JSON.stringify(payload), ip, userAgent, geo ? JSON.stringify(geo) : null];
  const result = await pool.query(query, values);

  return result.rows[0];
}

async function insertSubmissionEvent({ submissionId, tenantId, eventType, eventStatus, attemptCount, errorMessage, metadata }) {
  const query = `
    INSERT INTO submission_events (submission_id, tenant_id, event_type, event_status, attempt_count, error_message, metadata)
    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
    RETURNING id, submission_id, tenant_id, event_type, event_status, attempt_count, created_at;
  `;

  const values = [
    submissionId,
    tenantId,
    eventType,
    eventStatus,
    attemptCount,
    errorMessage || null,
    JSON.stringify(metadata || {}),
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

async function findSubmissionsByTenant({ tenantId, widgetId, limit = 50, offset = 0 }) {
  const values = [tenantId];
  const filters = ["tenant_id = $1"];

  if (widgetId) {
    values.push(widgetId);
    filters.push(`widget_id = $${values.length}`);
  }

  values.push(limit, offset);
  const query = `
    SELECT id, widget_id, tenant_id, payload, ip, user_agent, geo, status, created_at
    FROM submissions
    WHERE ${filters.join(" AND ")}
    ORDER BY created_at DESC
    LIMIT $${values.length - 1} OFFSET $${values.length};
  `;

  const result = await pool.query(query, values);
  return result.rows;
}

module.exports = {
  findWidgetById,
  insertSubmission,
  insertSubmissionEvent,
  findSubmissionsByTenant,
};
