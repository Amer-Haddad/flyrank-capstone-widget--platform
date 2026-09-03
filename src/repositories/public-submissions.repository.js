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

module.exports = {
  findWidgetById,
  insertSubmission,
};
