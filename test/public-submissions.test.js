const test = require("node:test");
const assert = require("node:assert/strict");

process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/flyrank_test";

const app = require("../src/app");
const geoEnrichmentService = require("../src/services/geo-enrichment.service");
const submissionsRepository = require("../src/repositories/public-submissions.repository");

const originalFindWidgetById = submissionsRepository.findWidgetById;
const originalInsertSubmission = submissionsRepository.insertSubmission;
const originalInsertSubmissionEvent = submissionsRepository.insertSubmissionEvent;
const originalReserveIdempotencyKey = submissionsRepository.reserveIdempotencyKey;
const originalCompleteIdempotencyKey = submissionsRepository.completeIdempotencyKey;

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

test("POST /api/public/submissions rejects oversized payloads with 413", async () => {
  const { server, port } = await buildServer();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/public/submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        widgetId: "11111111-1111-4111-8111-111111111111",
        payload: { notes: "x".repeat(65 * 1024) },
      }),
    });

    const body = await response.json();
    assert.equal(response.status, 413);
    assert.equal(body.success, false);
    assert.equal(body.error.code, "PAYLOAD_TOO_LARGE");
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

test("POST /api/public/submissions does not fail when async email side effect fails", async () => {
  submissionsRepository.findWidgetById = async () => ({
    id: "11111111-1111-4111-8111-111111111111",
    tenant_id: "22222222-2222-4222-8222-222222222222",
    is_active: true,
  });

  submissionsRepository.insertSubmission = async ({ widgetId, tenantId, payload, ip, userAgent, geo }) => ({
    id: "44444444-4444-4444-8444-444444444444",
    widget_id: widgetId,
    tenant_id: tenantId,
    payload,
    ip,
    user_agent: userAgent,
    geo,
    status: "received",
    created_at: new Date().toISOString(),
  });

  let eventInserted = false;
  submissionsRepository.insertSubmissionEvent = async () => {
    eventInserted = true;
    return { id: "55555555-5555-4555-8555-555555555555" };
  };

  const originalFetch = global.fetch;
  global.fetch = async () => {
    throw new Error("simulated email outage");
  };

  const { server, port } = await buildServer();

  try {
    const response = await originalFetch(`http://127.0.0.1:${port}/api/public/submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": `198.51.100.${Math.floor(Math.random() * 255)}`,
      },
      body: JSON.stringify({
        widgetId: "11111111-1111-4111-8111-111111111111",
        payload: { name: "Jamie Doe", email: "jamie@example.com" },
      }),
    });

    await new Promise((resolve) => setTimeout(resolve, 60));
    assert.equal(response.status, 201);
    assert.equal(eventInserted, true);
  } finally {
    global.fetch = originalFetch;
    server.close();
  }
});

test("POST /api/public/submissions replays an identical idempotent request", async () => {
  const originalFailureMode = process.env.GEO_ENRICHMENT_FAILURE_MODE;
  const originalFind = submissionsRepository.findWidgetById;
  const originalInsert = submissionsRepository.insertSubmission;
  let insertCount = 0;
  const storedResponse = {
    success: true,
    data: { submission: { id: "33333333-3333-4333-8333-333333333333", status: "received" } },
  };
  const { createRequestHash } = require("../src/utils/idempotency");

  process.env.GEO_ENRICHMENT_FAILURE_MODE = "both";
  submissionsRepository.findWidgetById = async () => ({
    id: "11111111-1111-4111-8111-111111111111",
    tenant_id: "22222222-2222-4222-8222-222222222222",
    is_active: true,
  });
  submissionsRepository.insertSubmission = async () => {
    insertCount += 1;
    return storedResponse.data.submission;
  };
  submissionsRepository.reserveIdempotencyKey = async ({ key }) => {
    if (insertCount === 0) return { status: "reserved", record: { key } };
    return {
      status: "existing",
      record: {
        tenant_id: "22222222-2222-4222-8222-222222222222",
        scope: "public-submission:11111111-1111-4111-8111-111111111111",
        request_hash: createRequestHash({
          widgetId: "11111111-1111-4111-8111-111111111111",
          payload: { email: "same@example.com" },
        }),
        response_status: 201,
        response_body: storedResponse,
      },
    };
  };
  submissionsRepository.completeIdempotencyKey = async () => {};

  const { server, port } = await buildServer();
  try {
    const createRequest = () => ({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "same-request",
        "X-Forwarded-For": "198.51.100.250",
      },
      body: JSON.stringify({
        widgetId: "11111111-1111-4111-8111-111111111111",
        payload: { email: "same@example.com" },
      }),
    });
    const first = await fetch(`http://127.0.0.1:${port}/api/public/submissions`, createRequest());
    const second = await fetch(`http://127.0.0.1:${port}/api/public/submissions`, createRequest());

    assert.equal(first.status, 201);
    assert.equal(second.status, 200);
    assert.equal(insertCount, 1);
  } finally {
    process.env.GEO_ENRICHMENT_FAILURE_MODE = originalFailureMode;
    submissionsRepository.findWidgetById = originalFind;
    submissionsRepository.insertSubmission = originalInsert;
    server.close();
  }
});

test.after(() => {
  submissionsRepository.findWidgetById = originalFindWidgetById;
  submissionsRepository.insertSubmission = originalInsertSubmission;
  submissionsRepository.insertSubmissionEvent = originalInsertSubmissionEvent;
  submissionsRepository.reserveIdempotencyKey = originalReserveIdempotencyKey;
  submissionsRepository.completeIdempotencyKey = originalCompleteIdempotencyKey;
});
