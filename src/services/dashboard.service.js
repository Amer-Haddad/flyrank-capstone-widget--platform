const submissionsRepository = require("../repositories/public-submissions.repository");
const { HttpError } = require("../utils/http-error");

function parseQuery(query) {
  const page = Number(query.page || 1);
  const pageSize = Number(query.pageSize || 50);

  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new HttpError(400, "INVALID_QUERY", "page must be positive and pageSize must be between 1 and 100.");
  }

  if (query.widgetId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(query.widgetId)) {
    throw new HttpError(400, "INVALID_QUERY", "widgetId must be a valid UUID.");
  }

  if (query.ip && (query.ip.length > 45 || /[\s,]/.test(query.ip))) {
    throw new HttpError(400, "INVALID_QUERY", "ip must be a valid IP filter.");
  }

  const from = query.from ? new Date(query.from) : null;
  const to = query.to ? new Date(query.to) : null;
  if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
    throw new HttpError(400, "INVALID_QUERY", "from and to must be valid ISO dates.");
  }
  if (from && to && from > to) {
    throw new HttpError(400, "INVALID_QUERY", "from must be earlier than or equal to to.");
  }

  return {
    widgetId: query.widgetId || null,
    ip: query.ip || null,
    from: from ? from.toISOString() : null,
    to: to ? to.toISOString() : null,
    limit: pageSize,
    offset: (page - 1) * pageSize,
    page,
    pageSize,
  };
}

function parseAnalyticsQuery(query) {
  if (query.widgetId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(query.widgetId)) {
    throw new HttpError(400, "INVALID_QUERY", "widgetId must be a valid UUID.");
  }

  const from = query.from ? new Date(query.from) : null;
  const to = query.to ? new Date(query.to) : null;
  if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
    throw new HttpError(400, "INVALID_QUERY", "from and to must be valid ISO dates.");
  }
  if (from && to && from > to) {
    throw new HttpError(400, "INVALID_QUERY", "from must be earlier than or equal to to.");
  }

  return {
    widgetId: query.widgetId || null,
    from: from ? from.toISOString() : null,
    to: to ? to.toISOString() : null,
  };
}

async function listSubmissions(tenantId, query) {
  const filters = parseQuery(query);
  const result = await submissionsRepository.findDashboardSubmissions({
    tenantId,
    ...filters,
  });

  return {
    items: result.items,
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / filters.pageSize),
    },
  };
}

async function getOverview(tenantId, query) {
  return submissionsRepository.getDashboardOverview({ tenantId, ...parseAnalyticsQuery(query) });
}

async function getWidgetStats(tenantId, query) {
  return submissionsRepository.getDashboardWidgetStats({ tenantId, ...parseAnalyticsQuery(query) });
}

async function getGeoStats(tenantId, query) {
  return submissionsRepository.getDashboardGeoStats({ tenantId, ...parseAnalyticsQuery(query) });
}

module.exports = {
  listSubmissions,
  getOverview,
  getWidgetStats,
  getGeoStats,
};
