const widgetsService = require("../services/widgets.service");

async function getPublicWidgetConfig(req, res, next) {
  try {
    const config = await widgetsService.getPublicWidgetConfig(req.params.id);
    res.set("Cache-Control", "public, max-age=60");
    return res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    return next(error);
  }
}

function serveWidgetScript(_req, res) {
  const script = widgetsService.createWidgetScript();
  res.set("Cache-Control", "public, max-age=31536000, immutable");
  res.type("application/javascript");
  return res.status(200).send(script);
}

module.exports = {
  getPublicWidgetConfig,
  serveWidgetScript,
};
