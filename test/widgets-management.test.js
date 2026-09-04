const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");

process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://localhost/flyrank_test";
process.env.JWT_SECRET = "test-secret-that-is-at-least-32-characters";
process.env.PUBLIC_BASE_URL = "https://api.example.test";

const widgetsRouter = require("../src/routes");
const widgetsService = require("../src/services/widgets-management.service");
const widgetsRepository = require("../src/repositories/widgets.repository");

function token() {
  return jwt.sign({ sub: "user-a", tenantId: "tenant-a", role: "owner" }, process.env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "5m",
  });
}

function buildServer() {
  const app = express();
  app.use(express.json());
  app.use("/api", widgetsRouter);
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve({ server, port: server.address().port }));
  });
}

test("widget create returns 201 and an embed snippet", async () => {
  const originalCreate = widgetsRepository.createWidget;
  widgetsRepository.createWidget = async (input) => ({
    id: "11111111-1111-4111-8111-111111111111",
    tenant_id: input.tenantId,
    type: input.type,
    title: input.title,
    description: null,
    button_text: input.buttonText || "Submit",
    version: 1,
    is_active: true,
    display_options: {},
    fields: input.fields,
  });
  const { server, port } = await buildServer();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/widgets`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "signup",
        title: "Newsletter",
        fields: [{ key: "email", label: "Email", type: "email", required: true }],
      }),
    });
    const body = await response.json();
    assert.equal(response.status, 201);
    assert.match(body.data.embedSnippet, /widget\.js\?id=11111111-1111-4111-8111-111111111111&v=1/);
  } finally {
    widgetsRepository.createWidget = originalCreate;
    server.close();
  }
});

test("widget list and read routes use the authenticated tenant", async () => {
  const originalList = widgetsRepository.listWidgetsForTenant;
  const originalFind = widgetsRepository.findWidgetConfigForTenant;
  const widgetId = "22222222-2222-4222-8222-222222222222";
  widgetsRepository.listWidgetsForTenant = async (tenantId) => [{ id: widgetId, tenant_id: tenantId, version: 1, is_active: true, type: "cta", title: "A", button_text: "Go", display_options: {} }];
  widgetsRepository.findWidgetConfigForTenant = async (id, tenantId) => ({ id, tenant_id: tenantId, version: 1, is_active: true, type: "cta", title: "A", button_text: "Go", display_options: {}, fields: [] });
  const { server, port } = await buildServer();

  try {
    const headers = { Authorization: `Bearer ${token()}` };
    const listResponse = await fetch(`http://127.0.0.1:${port}/api/widgets`, { headers });
    const readResponse = await fetch(`http://127.0.0.1:${port}/api/widgets/${widgetId}`, { headers });
    assert.equal(listResponse.status, 200);
    assert.equal(readResponse.status, 200);
    assert.equal((await readResponse.json()).data.tenantId, "tenant-a");
  } finally {
    widgetsRepository.listWidgetsForTenant = originalList;
    widgetsRepository.findWidgetConfigForTenant = originalFind;
    server.close();
  }
});

test("widget management routes reject unauthenticated requests", async () => {
  const { server, port } = await buildServer();
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/widgets`);
    assert.equal(response.status, 401);
  } finally {
    server.close();
  }
});

test("widget creation rejects invalid field definitions", async () => {
  const { server, port } = await buildServer();
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/widgets`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "signup", title: "Invalid", fields: [{ key: "email", label: "Email", type: "number" }] }),
    });
    assert.equal(response.status, 400);
  } finally {
    server.close();
  }
});
