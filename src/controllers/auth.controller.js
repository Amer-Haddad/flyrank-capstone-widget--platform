const authService = require("../services/auth.service");

async function register(req, res, next) {
  try {
    const data = await authService.registerOwner(req.body);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  register,
};
