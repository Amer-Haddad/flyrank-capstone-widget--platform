const test = require("node:test");
const assert = require("node:assert/strict");

process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:Capstone998789..1@localhost:5432/CapstoneDB";

const app = require("../src/app");
const widgetsRepository = require("../src/repositories/widgets.repository");

const originalFindPublicWidgetConfig = widgetsRepository.findPublicWidgetConfig;

function buildServer() {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

test("GET /widget.js returns a versioned widget script with long cache headers", async () => {
  const { server, port } = await buildServer();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/widget.js?id=11111111-1111-4111-8111-111111111111&v=7`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control"), /public, max-age=31536000, immutable/i);
    assert.match(body, /fetch\(configUrl/i);
  } finally {
    server.close();
  }
});

test("GET /api/public/widgets/:id/config returns public config JSON", async () => {
  widgetsRepository.findPublicWidgetConfig = async () => ({
    id: "11111111-1111-4111-8111-111111111111",
    tenant_id: "22222222-2222-4222-8222-222222222222",
    type: "signup",
    title: "Newsletter sign up",
    description: "Stay in touch.",
    button_text: "Join now",
    version: 7,
    is_active: true,
    display_options: { theme: "light" },
    fields: [
      { id: "field-1", key: "name", label: "Full name", type: "text", required: true, sortOrder: 1, validationRules: {} },
      { id: "field-2", key: "email", label: "Email", type: "email", required: true, sortOrder: 2, validationRules: {} },
    ],
  });

  const { server, port } = await buildServer();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/public/widgets/11111111-1111-4111-8111-111111111111/config`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "public, max-age=60");
    assert.equal(body.success, true);
    assert.equal(body.data.title, "Newsletter sign up");
    assert.equal(body.data.fields.length, 2);
  } finally {
    server.close();
  }
});

test.after(() => {
  widgetsRepository.findPublicWidgetConfig = originalFindPublicWidgetConfig;
});
