const { pool } = require("../database/pool");

async function registerOwner({ tenantName, tenantSlug, email, passwordHash }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const tenantResult = await client.query(
      `INSERT INTO tenants (name, slug)
       VALUES ($1, $2)
       RETURNING id, name, slug`,
      [tenantName, tenantSlug],
    );
    const tenant = tenantResult.rows[0];

    const userResult = await client.query(
      `INSERT INTO users (tenant_id, email, password_hash, role)
       VALUES ($1, $2, $3, 'owner')
       RETURNING id, tenant_id, email, role`,
      [tenant.id, email, passwordHash],
    );

    await client.query("COMMIT");
    return { tenant, user: userResult.rows[0] };
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") {
      error.statusCode = 409;
      error.code = "REGISTRATION_CONFLICT";
      error.message = "The tenant slug or account already exists.";
    }
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  registerOwner,
};
