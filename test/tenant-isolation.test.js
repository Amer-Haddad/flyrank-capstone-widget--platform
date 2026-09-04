const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://localhost/flyrank_test";

const { authenticateOwner } = require("../src/middleware/authenticate-owner");
const { requireTenantContext } = require("../src/middleware/require-tenant-context");
const { errorHandler } = require("../src/middleware/error-handler");
const widgetsRepository = require("../src/repositories/widgets.repository");
const submissionsRepository = require("../src/repositories/public-submissions.repository");
const { pool } = require("../src/database/pool");

function buildServer() {
  const app = express();
  app.get("/tenant", authenticateOwner, requireTenantContext, (req, res) => {
    res.json({ success: true, data: req.tenant });
  });
  app.use(errorHandler);

  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve({ server, port: server.address().port }));
  });
}

test("tenant context is derived from authenticated owner claims", async () => {
  process.env.JWT_SECRET = "test-secret-that-is-at-least-32-characters";
  const jwt = require("jsonwebtoken");
  const token = jwt.sign(
    { sub: "user-a", tenantId: "tenant-a", role: "owner" },
    process.env.JWT_SECRET,
    { algorithm: "HS256", expiresIn: "5m" },
  );
  const { server, port } = await buildServer();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/tenant`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body.data, { id: "tenant-a", userId: "user-a" });
  } finally {
    server.close();
  }
});

test("tenant context rejects requests without authenticated tenant claims", async () => {
  const app = express();
  app.get("/tenant", requireTenantContext, (_req, res) => res.sendStatus(200));
  app.use(errorHandler);
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });

  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/tenant`);
    assert.equal(response.status, 401);
  } finally {
    server.close();
  }
});

test("widget repository scopes lookup by widget ID and tenant ID", async () => {
  const originalQuery = pool.query;
  const queries = [];
  pool.query = async (query, values) => {
    queries.push({ query, values });
    return { rows: values[1] === "tenant-a" ? [{ id: "widget-a", tenant_id: "tenant-a" }] : [] };
  };

  try {
    const sameTenant = await widgetsRepository.findWidgetByIdForTenant("widget-a", "tenant-a");
    const otherTenant = await widgetsRepository.findWidgetByIdForTenant("widget-a", "tenant-b");

    assert.equal(sameTenant.tenant_id, "tenant-a");
    assert.equal(otherTenant, null);
    assert.match(queries[0].query, /WHERE id = \$1 AND tenant_id = \$2/);
  } finally {
    pool.query = originalQuery;
  }
});

test("submission repository scopes list queries by tenant ID", async () => {
  const originalQuery = pool.query;
  let captured;
  pool.query = async (query, values) => {
    captured = { query, values };
    return { rows: [] };
  };

  try {
    await submissionsRepository.findSubmissionsByTenant({
      tenantId: "tenant-a",
      widgetId: "widget-a",
      limit: 10,
      offset: 0,
    });

    assert.match(captured.query, /WHERE tenant_id = \$1 AND widget_id = \$2/);
    assert.deepEqual(captured.values, ["tenant-a", "widget-a", 10, 0]);
  } finally {
    pool.query = originalQuery;
  }
});
