const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "test-secret-that-is-at-least-32-characters";
process.env.JWT_ISSUER = "flyrank-widget-platform";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://localhost/flyrank_test";

const app = require("../src/app");
const authRepository = require("../src/repositories/auth.repository");

function buildServer() {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve({ server, port: server.address().port }));
  });
}

test("registration creates an owner and returns a usable JWT", async () => {
  const originalRegister = authRepository.registerOwner;
  authRepository.registerOwner = async (input) => ({
    tenant: { id: "tenant-new", name: input.tenantName, slug: input.tenantSlug },
    user: { id: "user-new", tenant_id: "tenant-new", email: input.email, role: "owner" },
  });
  const { server, port } = await buildServer();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://localhost:5500" },
      body: JSON.stringify({
        tenantName: "Example Company",
        tenantSlug: "example-company",
        email: "owner@example.com",
        password: "correct-horse-battery",
      }),
    });
    const body = await response.json();
    const claims = jwt.verify(body.data.token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: process.env.JWT_ISSUER,
    });

    assert.equal(response.status, 201);
    assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:5500");
    assert.equal(body.data.user.email, "owner@example.com");
    assert.equal(claims.sub, "user-new");
    assert.equal(claims.tenantId, "tenant-new");
    assert.equal(claims.role, "owner");
  } finally {
    authRepository.registerOwner = originalRegister;
    server.close();
  }
});

test("registration rejects invalid input", async () => {
  const { server, port } = await buildServer();
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://localhost:5500" },
      body: JSON.stringify({
        tenantName: "A",
        tenantSlug: "Bad Slug",
        email: "invalid",
        password: "short",
      }),
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error.code, "VALIDATION_ERROR");
  } finally {
    server.close();
  }
});

test("registration maps duplicate database records to conflict", async () => {
  const originalRegister = authRepository.registerOwner;
  authRepository.registerOwner = async () => {
    const error = new Error("duplicate");
    error.code = "23505";
    throw error;
  };
  const { server, port } = await buildServer();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://localhost:5500" },
      body: JSON.stringify({
        tenantName: "Example Company",
        tenantSlug: "example-company",
        email: "owner@example.com",
        password: "correct-horse-battery",
      }),
    });
    const body = await response.json();

    assert.equal(response.status, 409);
    assert.equal(body.error.code, "REGISTRATION_CONFLICT");
  } finally {
    authRepository.registerOwner = originalRegister;
    server.close();
  }
});

test("registration responds to browser preflight requests", async () => {
  const { server, port } = await buildServer();
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/auth/register`, {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:5500",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
      },
    });

    test("protected widget preflight requests are handled before authentication", async () => {
      const { server, port } = await buildServer();
      try {
        const response = await fetch(`http://127.0.0.1:${port}/api/widgets`, {
          method: "OPTIONS",
          headers: {
            Origin: "http://localhost:5500",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
          },
        });

        assert.equal(response.status, 204);
        assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:5500");
        assert.match(response.headers.get("access-control-allow-headers"), /Authorization/i);
      } finally {
        server.close();
      }
    });

    assert.equal(response.status, 204);
    assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:5500");
    assert.match(response.headers.get("access-control-allow-methods"), /POST/);
  } finally {
    server.close();
  }
});
