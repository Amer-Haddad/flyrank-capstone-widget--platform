const dashboardService = require("../services/dashboard.service");

async function listSubmissions(req, res, next) {
  try {
    const data = await dashboardService.listSubmissions(req.tenant.id, req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function getOverview(req, res, next) {
  try {
    const data = await dashboardService.getOverview(req.tenant.id, req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function getWidgetStats(req, res, next) {
  try {
    const data = await dashboardService.getWidgetStats(req.tenant.id, req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function getGeoStats(req, res, next) {
  try {
    const data = await dashboardService.getGeoStats(req.tenant.id, req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listSubmissions,
  getOverview,
  getWidgetStats,
  getGeoStats,
};
