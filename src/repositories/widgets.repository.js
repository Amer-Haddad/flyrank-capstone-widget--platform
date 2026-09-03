const { pool } = require("../database/pool");

async function findPublicWidgetConfig(widgetId) {
  const query = `
    SELECT
      w.id,
      w.tenant_id,
      w.type,
      w.title,
      w.description,
      w.button_text,
      w.version,
      w.is_active,
      w.display_options,
      COALESCE(
        json_agg(
          json_build_object(
            'id', wf.id,
            'key', wf.field_key,
            'label', wf.label,
            'type', wf.field_type,
            'required', wf.is_required,
            'sortOrder', wf.sort_order,
            'validationRules', wf.validation_rules
          )
          ORDER BY wf.sort_order ASC
        ) FILTER (WHERE wf.id IS NOT NULL),
        '[]'::json
      ) AS fields
    FROM widgets w
    LEFT JOIN widget_fields wf ON wf.widget_id = w.id AND wf.tenant_id = w.tenant_id
    WHERE w.id = $1
    GROUP BY w.id, w.tenant_id, w.type, w.title, w.description, w.button_text, w.version, w.is_active, w.display_options
    LIMIT 1;
  `;

  const result = await pool.query(query, [widgetId]);
  return result.rows[0] || null;
}

module.exports = {
  findPublicWidgetConfig,
};
