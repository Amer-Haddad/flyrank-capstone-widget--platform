const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://localhost/flyrank_test";
process.env.JWT_SECRET = "test-secret-that-is-at-least-32-characters";
process.env.JWT_ISSUER = "flyrank-widget-platform";
const app = require("../src/app");
const submissionsRepository = require("../src/repositories/public-submissions.repository");

function token(tenantId = "tenant-a") {
  return jwt.sign({ sub: "user-a", tenantId, role: "owner" }, process.env.JWT_SECRET, {
    algorithm: "HS256",
    issuer: process.env.JWT_ISSUER,
    expiresIn: "5m",
  });
}

function buildServer() {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve({ server, port: server.address().port }));
  });
}

test("dashboard submissions returns tenant-scoped paginated results", async () => {
  const originalFind = submissionsRepository.findDashboardSubmissions;
  let received;
  submissionsRepository.findDashboardSubmissions = async (filters) => {
    received = filters;
    return {
      items: [{ id: "submission-a", tenant_id: filters.tenantId }],
      total: 6,
    };
  };
  const { server, port } = await buildServer();

  try {
    const response = await fetch(
      `http://127.0.0.1:${port}/api/dashboard/submissions?page=2&pageSize=2&from=2026-01-01T00:00:00.000Z`,
      { headers: { Authorization: `Bearer ${token()}` } },
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(received.tenantId, "tenant-a");
    assert.equal(received.limit, 2);
    assert.equal(received.offset, 2);
    assert.equal(body.data.items.length, 1);
    assert.deepEqual(body.data.pagination, { page: 2, pageSize: 2, total: 6, totalPages: 3 });
  } finally {
    submissionsRepository.findDashboardSubmissions = originalFind;
    server.close();
  }
});

test("dashboard submissions rejects unauthenticated requests", async () => {
  const { server, port } = await buildServer();
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/dashboard/submissions`);
    assert.equal(response.status, 401);
  } finally {
    server.close();
  }
});

test("dashboard submissions rejects invalid pagination and dates", async () => {
  const { server, port } = await buildServer();
  try {
    for (const query of ["page=0", "from=not-a-date"]) {
      const response = await fetch(
        `http://127.0.0.1:${port}/api/dashboard/submissions?${query}`,
        { headers: { Authorization: `Bearer ${token()}` } },
      );
      const body = await response.json();
      assert.equal(response.status, 400);
      assert.equal(body.error.code, "INVALID_QUERY");
    }
  } finally {
    server.close();
  }
});
