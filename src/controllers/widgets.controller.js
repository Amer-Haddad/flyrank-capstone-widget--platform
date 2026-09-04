const widgetsManagementService = require("../services/widgets-management.service");

async function createWidget(req, res, next) {
  try {
    const widget = await widgetsManagementService.createWidget(req.tenant.id, req.body);
    return res.status(201).json({ success: true, data: widget });
  } catch (error) {
    return next(error);
  }
}

async function listWidgets(req, res, next) {
  try {
    const widgets = await widgetsManagementService.listWidgets(req.tenant.id);
    return res.status(200).json({ success: true, data: widgets });
  } catch (error) {
    return next(error);
  }
}

async function getWidget(req, res, next) {
  try {
    const widget = await widgetsManagementService.getWidget(req.tenant.id, req.params.id);
    return res.status(200).json({ success: true, data: widget });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createWidget,
  listWidgets,
  getWidget,
};
