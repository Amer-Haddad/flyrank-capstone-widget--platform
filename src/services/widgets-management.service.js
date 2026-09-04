const widgetsRepository = require("../repositories/widgets.repository");
const { HttpError } = require("../utils/http-error");
const { createEmbedSnippet } = require("../utils/embed-snippet");

function presentWidget(widget) {
  return {
    id: widget.id,
    tenantId: widget.tenant_id,
    type: widget.type,
    title: widget.title,
    description: widget.description || null,
    buttonText: widget.button_text,
    version: widget.version,
    isActive: widget.is_active,
    displayOptions: widget.display_options || {},
    fields: widget.fields || [],
    embedSnippet: createEmbedSnippet(widget.id, widget.version),
  };
}

async function createWidget(tenantId, input) {
  return presentWidget(await widgetsRepository.createWidget({ tenantId, ...input }));
}

async function listWidgets(tenantId) {
  const widgets = await widgetsRepository.listWidgetsForTenant(tenantId);
  return widgets.map(presentWidget);
}

async function getWidget(tenantId, widgetId) {
  const widget = await widgetsRepository.findWidgetConfigForTenant(widgetId, tenantId);
  if (!widget) throw new HttpError(404, "WIDGET_NOT_FOUND", "Widget does not exist.");
  return presentWidget(widget);
}

async function updateWidget(tenantId, widgetId, input) {
  const widget = await widgetsRepository.updateWidgetForTenant(widgetId, tenantId, input);
  if (!widget) throw new HttpError(404, "WIDGET_NOT_FOUND", "Widget does not exist.");
  return presentWidget(widget);
}

async function deleteWidget(tenantId, widgetId) {
  const deleted = await widgetsRepository.deleteWidgetForTenant(widgetId, tenantId);
  if (!deleted) throw new HttpError(404, "WIDGET_NOT_FOUND", "Widget does not exist.");
}

module.exports = {
  createWidget,
  listWidgets,
  getWidget,
  updateWidget,
  deleteWidget,
};
