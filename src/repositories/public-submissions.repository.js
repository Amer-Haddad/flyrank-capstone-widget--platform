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

async function insertSubmission({ widgetId, tenantId, payload, ip, userAgent }) {
  const query = `
    INSERT INTO submissions (widget_id, tenant_id, payload, ip, user_agent, status)
    VALUES ($1, $2, $3::jsonb, $4, $5, 'received')
    RETURNING id, widget_id, tenant_id, status, created_at;
  `;

  const values = [widgetId, tenantId, JSON.stringify(payload), ip, userAgent];
  const result = await pool.query(query, values);

  return result.rows[0];
}

module.exports = {
  findWidgetById,
  insertSubmission,
};
