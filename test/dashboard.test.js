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
      `http://127.0.0.1:${port}/api/dashboard/submissions?page=2&pageSize=2&ip=203.0.113.10&from=2026-01-01T00:00:00.000Z`,
      { headers: { Authorization: `Bearer ${token()}` } },
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(received.tenantId, "tenant-a");
    assert.equal(received.limit, 2);
    assert.equal(received.offset, 2);
    assert.equal(received.ip, "203.0.113.10");
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
    for (const query of ["page=0", "from=not-a-date", "ip=not a valid ip"]) {
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

test("dashboard analytics returns tenant-scoped overview, widget, and geo data", async () => {
  const originals = {
    overview: submissionsRepository.getDashboardOverview,
    widgets: submissionsRepository.getDashboardWidgetStats,
    geo: submissionsRepository.getDashboardGeoStats,
  };
  const received = [];
  submissionsRepository.getDashboardOverview = async (filters) => {
    received.push(["overview", filters]);
    return { total: 2, byDay: [{ date: "2026-09-04", count: 2 }] };
  };
  submissionsRepository.getDashboardWidgetStats = async (filters) => {
    received.push(["widgets", filters]);
    return [{ widgetId: "11111111-1111-4111-8111-111111111111", count: 2 }];
  };
  submissionsRepository.getDashboardGeoStats = async (filters) => {
    received.push(["geo", filters]);
    return [{ country: "US", region: "CA", city: "San Francisco", count: 2 }];
  };
  const { server, port } = await buildServer();

  try {
    const headers = { Authorization: `Bearer ${token("tenant-analytics")}` };
    const [overviewResponse, widgetsResponse, geoResponse] = await Promise.all([
      fetch(`http://127.0.0.1:${port}/api/dashboard/stats/overview?from=2026-09-01`, { headers }),
      fetch(`http://127.0.0.1:${port}/api/dashboard/stats/widgets?to=2026-09-05`, { headers }),
      fetch(`http://127.0.0.1:${port}/api/dashboard/stats/geo`, { headers }),
    ]);

    assert.equal(overviewResponse.status, 200);
    assert.deepEqual((await overviewResponse.json()).data, {
      total: 2,
      byDay: [{ date: "2026-09-04", count: 2 }],
    });
    assert.deepEqual((await widgetsResponse.json()).data, [
      { widgetId: "11111111-1111-4111-8111-111111111111", count: 2 },
    ]);
    assert.deepEqual((await geoResponse.json()).data, [
      { country: "US", region: "CA", city: "San Francisco", count: 2 },
    ]);
    assert.equal(received.length, 3);
    for (const [, filters] of received) {
      assert.equal(filters.tenantId, "tenant-analytics");
    }
  } finally {
    submissionsRepository.getDashboardOverview = originals.overview;
    submissionsRepository.getDashboardWidgetStats = originals.widgets;
    submissionsRepository.getDashboardGeoStats = originals.geo;
    server.close();
  }
});

test("dashboard analytics requires authentication", async () => {
  const { server, port } = await buildServer();
  try {
    for (const path of ["overview", "widgets", "geo"]) {
      const response = await fetch(`http://127.0.0.1:${port}/api/dashboard/stats/${path}`);
      assert.equal(response.status, 401);
    }
  } finally {
    server.close();
  }
});

test("dashboard analytics rejects invalid filters", async () => {
  const { server, port } = await buildServer();
  try {
    const response = await fetch(
      `http://127.0.0.1:${port}/api/dashboard/stats/geo?widgetId=not-a-uuid&from=2026-09-05&to=2026-09-01`,
      { headers: { Authorization: `Bearer ${token()}` } },
    );
    const body = await response.json();
    assert.equal(response.status, 400);
    assert.equal(body.error.code, "INVALID_QUERY");
  } finally {
    server.close();
  }
});
