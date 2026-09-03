const test = require("node:test");
const assert = require("node:assert/strict");

process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/flyrank_test";

const app = require("../src/app");
const geoEnrichmentService = require("../src/services/geo-enrichment.service");
const submissionsRepository = require("../src/repositories/public-submissions.repository");

const originalFindWidgetById = submissionsRepository.findWidgetById;
const originalInsertSubmission = submissionsRepository.insertSubmission;

function buildServer() {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

test("POST /api/public/submissions creates a submission for valid payloads", async () => {
  submissionsRepository.findWidgetById = async () => ({
    id: "11111111-1111-4111-8111-111111111111",
    tenant_id: "22222222-2222-4222-8222-222222222222",
    is_active: true,
  });
  submissionsRepository.insertSubmission = async ({ widgetId, tenantId, payload, ip, userAgent }) => ({
    id: "33333333-3333-4333-8333-333333333333",
    widget_id: widgetId,
    tenant_id: tenantId,
    payload,
    ip,
    user_agent: userAgent,
    status: "received",
    created_at: new Date().toISOString(),
  });

  const { server, port } = await buildServer();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/public/submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Origin": "https://example.com",
      },
      body: JSON.stringify({
        widgetId: "11111111-1111-4111-8111-111111111111",
        payload: {
          name: "Jane Doe",
          email: "jane@example.com",
        },
      }),
    });

    const body = await response.json();
    assert.equal(response.status, 201);
    assert.equal(body.success, true);
    assert.equal(body.data.submission.status, "received");
    assert.equal(body.data.submission.widget_id, "11111111-1111-4111-8111-111111111111");
  } finally {
    server.close();
  }
});

test("POST /api/public/submissions rejects invalid payloads with 400", async () => {
  submissionsRepository.findWidgetById = async () => ({
    id: "11111111-1111-4111-8111-111111111111",
    tenant_id: "22222222-2222-4222-8222-222222222222",
    is_active: true,
  });
  submissionsRepository.insertSubmission = async () => ({
    id: "33333333-3333-4333-8333-333333333333",
    status: "received",
  });

  const { server, port } = await buildServer();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/public/submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        widgetId: "11111111-1111-4111-8111-111111111111",
        payload: {},
      }),
    });

    const body = await response.json();
    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.equal(body.error.code, "VALIDATION_ERROR");
  } finally {
    server.close();
  }
});

test("POST /api/public/submissions blocks spam honeypots", async () => {
  submissionsRepository.findWidgetById = async () => ({
    id: "11111111-1111-4111-8111-111111111111",
    tenant_id: "22222222-2222-4222-8222-222222222222",
    is_active: true,
  });
  submissionsRepository.insertSubmission = async () => ({
    id: "33333333-3333-4333-8333-333333333333",
    status: "received",
  });

  const { server, port } = await buildServer();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/public/submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        widgetId: "11111111-1111-4111-8111-111111111111",
        payload: { name: "Jane Doe" },
        website: "https://spam.example",
      }),
    });

    const body = await response.json();
    assert.equal(response.status, 400);
    assert.equal(body.error.code, "VALIDATION_ERROR");
  } finally {
    server.close();
  }
});

test("POST /api/public/submissions rate-limits repeated requests", async () => {
  submissionsRepository.findWidgetById = async () => ({
    id: "11111111-1111-4111-8111-111111111111",
    tenant_id: "22222222-2222-4222-8222-222222222222",
    is_active: true,
  });
  submissionsRepository.insertSubmission = async () => ({
    id: "33333333-3333-4333-8333-333333333333",
    status: "received",
  });

  const { server, port } = await buildServer();

  try {
    const requests = Array.from({ length: 21 }, () => fetch(`http://127.0.0.1:${port}/api/public/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        widgetId: "11111111-1111-4111-8111-111111111111",
        payload: { name: "Jane Doe", email: "jane@example.com" },
      }),
    }));

    const responses = await Promise.all(requests);
    assert.ok(responses.some((response) => response.status === 429));
  } finally {
    server.close();
  }
});

test("resolveGeoForIp falls back to the secondary provider when primary fails", async () => {
  const originalFetch = global.fetch;
  const calls = [];

  global.fetch = async (url) => {
    calls.push(String(url));

    if (url.includes("ip-api.com")) {
      return {
        ok: false,
        status: 500,
      };
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({
        city: "Seattle",
        region: "Washington",
        country_name: "United States",
        latitude: 47.6062,
        longitude: -122.3321,
      }),
    };
  };

  try {
    const geo = await geoEnrichmentService.resolveGeoForIp("8.8.8.8");
    assert.equal(geo && geo.source, "secondary");
    assert.equal(geo && geo.city, "Seattle");
    assert.equal(calls.length, 2);
  } finally {
    global.fetch = originalFetch;
  }
});

test("resolveGeoForIp returns null when both providers fail", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: false,
    status: 500,
  });

  try {
    const geo = await geoEnrichmentService.resolveGeoForIp("8.8.8.8");
    assert.equal(geo, null);
  } finally {
    global.fetch = originalFetch;
  }
});

test.after(() => {
  submissionsRepository.findWidgetById = originalFindWidgetById;
  submissionsRepository.insertSubmission = originalInsertSubmission;
});
