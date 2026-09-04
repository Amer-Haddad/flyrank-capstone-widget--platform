const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "test-secret-that-is-at-least-32-characters";
process.env.JWT_ISSUER = "flyrank-widget-platform";

const { authenticateOwner } = require("../src/middleware/authenticate-owner");
const { errorHandler } = require("../src/middleware/error-handler");

function buildProtectedServer() {
  const app = express();
  app.get("/protected", authenticateOwner, (req, res) => {
    res.json({ success: true, data: req.owner });
  });
  app.use(errorHandler);

  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve({ server, port: server.address().port }));
  });
}

function createToken(claims = {}) {
  return jwt.sign({
    sub: "user-1",
    tenantId: "tenant-1",
    role: "owner",
    ...claims,
  }, process.env.JWT_SECRET, {
    algorithm: "HS256",
    issuer: process.env.JWT_ISSUER,
    expiresIn: "5m",
  });
}

test("protected routes reject requests without credentials", async () => {
  const { server, port } = await buildProtectedServer();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/protected`);
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.equal(body.error.code, "UNAUTHORIZED");
  } finally {
    server.close();
  }
});

test("protected routes reject malformed and invalid bearer tokens", async () => {
  const { server, port } = await buildProtectedServer();

  try {
    const malformed = await fetch(`http://127.0.0.1:${port}/protected`, {
      headers: { Authorization: "Basic invalid" },
    });
    const invalid = await fetch(`http://127.0.0.1:${port}/protected`, {
      headers: { Authorization: "Bearer invalid.token.value" },
    });

    assert.equal(malformed.status, 401);
    assert.equal(invalid.status, 401);
  } finally {
    server.close();
  }
});

test("protected routes accept a valid owner token and expose tenant context", async () => {
  const { server, port } = await buildProtectedServer();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/protected`, {
      headers: { Authorization: `Bearer ${createToken()}` },
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body.data, {
      userId: "user-1",
      tenantId: "tenant-1",
      role: "owner",
    });
  } finally {
    server.close();
  }
});

test("protected routes reject tokens missing tenant claims", async () => {
  const { server, port } = await buildProtectedServer();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/protected`, {
      headers: { Authorization: `Bearer ${createToken({ tenantId: undefined })}` },
    });

    assert.equal(response.status, 401);
  } finally {
    server.close();
  }
});
