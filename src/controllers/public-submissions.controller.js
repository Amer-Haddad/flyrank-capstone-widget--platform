const submissionsService = require("../services/public-submissions.service");

async function createSubmission(req, res, next) {
  try {
    const submission = await submissionsService.createSubmission({
      widgetId: req.body.widgetId,
      payload: req.body.payload,
      req,
    });

    return res.status(201).json({
      success: true,
      data: {
        submission,
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createSubmission,
};
