const healthRepository = require("../repositories/health.repository");

async function getHealth() {
  const now = await healthRepository.getCurrentIsoTime();

  return {
    status: "ok",
    timestamp: now,
  };
}

module.exports = {
  getHealth,
};
