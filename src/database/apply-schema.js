require("dotenv").config();

const fs = require("node:fs/promises");
const path = require("node:path");
const { pool } = require("./pool");

async function applySchema() {
  const schemaPath = path.join(__dirname, "schema.sql");
  const schemaSql = await fs.readFile(schemaPath, "utf8");

  await pool.query(schemaSql);
  console.log("Database schema applied successfully.");
}

applySchema()
  .then(async () => {
    await pool.end();
  })
  .catch(async (error) => {
    console.error("Failed to apply schema:", error.message);
    await pool.end();
    process.exitCode = 1;
  });
