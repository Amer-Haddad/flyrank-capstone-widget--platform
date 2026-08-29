require("dotenv").config();

const { pool } = require("../database/pool");

async function initDatabase() {
  const client = await pool.connect();

  try {
    await client.query("SELECT 1;");
  } finally {
    client.release();
  }
}

module.exports = { pool, initDatabase };