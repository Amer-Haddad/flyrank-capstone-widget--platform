const crypto = require("node:crypto");

function createRequestHash({ widgetId, payload }) {
  return crypto.createHash("sha256")
    .update(JSON.stringify({ widgetId, payload }))
    .digest("hex");
}

function getIdempotencyKey(req) {
  const key = req.get("idempotency-key");
  return key && key.trim() ? key.trim() : null;
}

module.exports = {
  createRequestHash,
  getIdempotencyKey,
};
