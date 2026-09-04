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

async function findWidgetByIdForTenant(widgetId, tenantId) {
  const query = `
    SELECT id, tenant_id, type, title, description, button_text, version, is_active, display_options
    FROM widgets
    WHERE id = $1 AND tenant_id = $2
    LIMIT 1;
  `;

  const result = await pool.query(query, [widgetId, tenantId]);
  return result.rows[0] || null;
}

async function createWidget({ tenantId, type, title, description, buttonText, displayOptions, fields }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const widgetResult = await client.query(
      `INSERT INTO widgets (tenant_id, type, title, description, button_text, display_options)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       RETURNING id, tenant_id, type, title, description, button_text, version, is_active, display_options, created_at, updated_at`,
      [tenantId, type, title, description || null, buttonText || "Submit", JSON.stringify(displayOptions || {})],
    );

    const widget = widgetResult.rows[0];
    for (const [sortOrder, field] of fields.entries()) {
      await client.query(
        `INSERT INTO widget_fields (widget_id, tenant_id, field_key, label, field_type, is_required, sort_order, validation_rules)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
        [widget.id, tenantId, field.key, field.label, field.type, Boolean(field.required), sortOrder, JSON.stringify(field.validationRules || {})],
      );
    }

    await client.query("COMMIT");
    return { ...widget, fields };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function listWidgetsForTenant(tenantId) {
  const result = await pool.query(
    `SELECT id, tenant_id, type, title, description, button_text, version, is_active, display_options, created_at, updated_at
     FROM widgets WHERE tenant_id = $1 ORDER BY created_at DESC`,
    [tenantId],
  );
  return result.rows;
}

async function findWidgetConfigForTenant(widgetId, tenantId) {
  const widget = await findWidgetByIdForTenant(widgetId, tenantId);
  if (!widget) return null;

  const fields = await pool.query(
    `SELECT id, field_key AS key, label, field_type AS type, is_required AS required, sort_order AS "sortOrder", validation_rules AS "validationRules"
     FROM widget_fields WHERE widget_id = $1 AND tenant_id = $2 ORDER BY sort_order ASC`,
    [widgetId, tenantId],
  );
  return { ...widget, fields: fields.rows };
}

async function updateWidgetForTenant(widgetId, tenantId, input) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const updates = [];
    const values = [widgetId, tenantId];
    const columnMap = {
      type: "type",
      title: "title",
      description: "description",
      buttonText: "button_text",
      displayOptions: "display_options",
    };

    Object.entries(columnMap).forEach(([inputKey, column]) => {
      if (input[inputKey] !== undefined) {
        values.push(column === "display_options" ? JSON.stringify(input[inputKey]) : input[inputKey]);
        updates.push(`${column} = $${values.length}${column === "display_options" ? "::jsonb" : ""}`);
      }
    });

    const hasFields = input.fields !== undefined;
    if (updates.length > 0 || hasFields) {
      updates.push("version = version + 1");
      updates.push("updated_at = NOW()");
      const widgetResult = await client.query(
        `UPDATE widgets SET ${updates.join(", ")}
         WHERE id = $1 AND tenant_id = $2
         RETURNING id, tenant_id, type, title, description, button_text, version, is_active, display_options`,
        values,
      );

      if (widgetResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return null;
      }

      if (hasFields) {
        await client.query("DELETE FROM widget_fields WHERE widget_id = $1 AND tenant_id = $2", [widgetId, tenantId]);
        for (const [sortOrder, field] of input.fields.entries()) {
          await client.query(
            `INSERT INTO widget_fields (widget_id, tenant_id, field_key, label, field_type, is_required, sort_order, validation_rules)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
            [widgetId, tenantId, field.key, field.label, field.type, Boolean(field.required), sortOrder, JSON.stringify(field.validationRules || {})],
          );
        }
      }

      await client.query("COMMIT");
      return findWidgetConfigForTenant(widgetId, tenantId);
    }

    await client.query("ROLLBACK");
    return findWidgetConfigForTenant(widgetId, tenantId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function deleteWidgetForTenant(widgetId, tenantId) {
  const result = await pool.query(
    "DELETE FROM widgets WHERE id = $1 AND tenant_id = $2 RETURNING id",
    [widgetId, tenantId],
  );
  return result.rowCount > 0;
}

module.exports = {
  findPublicWidgetConfig,
  findWidgetByIdForTenant,
  createWidget,
  listWidgetsForTenant,
  findWidgetConfigForTenant,
  updateWidgetForTenant,
  deleteWidgetForTenant,
};
