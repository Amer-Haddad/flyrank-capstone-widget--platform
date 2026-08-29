const { Pool } = require('pg');
require('dotenv').config();

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test the connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error connecting to PostgreSQL:', err.message);
  } else {
    console.log('✅ Connected to PostgreSQL database');
    release();
  }
});

// Helper to enable pgcrypto (for gen_random_uuid())
async function enablePgcrypto() {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
}

// Create Widget table
async function createWidget() {
  try {
    await enablePgcrypto();

    // Create ENUM type for Widget.type (idempotent)
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_Widgets_type" AS ENUM ('signup', 'contact', 'cta');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create Widgets table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Widgets" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" VARCHAR(255) NOT NULL,
        type "enum_Widgets_type" NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        fields JSONB DEFAULT '[]'::jsonb,
        "buttonText" VARCHAR(255) DEFAULT 'Submit',
        "displayOptions" JSONB DEFAULT '{}'::jsonb,
        "isActive" BOOLEAN DEFAULT true
      );
    `);

    console.log('✅ Widgets table created/verified');
  } catch (err) {
    console.error('❌ Error creating Widgets table:', err.message);
    throw err;
  }
}

// Create Submission table
async function createSubmission() {
  try {
    await enablePgcrypto();

    // Create Submissions table with foreign key to Widgets
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Submissions" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "widgetId" UUID NOT NULL,
        "tenantId" VARCHAR(255) NOT NULL,
        data JSONB NOT NULL,
        ip VARCHAR(255),
        geo JSONB,
        status VARCHAR(255) DEFAULT 'received',
        CONSTRAINT fk_submissions_widget
          FOREIGN KEY ("widgetId")
          REFERENCES "Widgets" (id)
          ON DELETE CASCADE
      );
    `);

    console.log('✅ Submissions table created/verified');
  } catch (err) {
    console.error('❌ Error creating Submissions table:', err.message);
    throw err;
  }
}

// Initialize both tables in order
async function initDatabase() {
  try {
    await createWidget();      // Widgets must exist before Submissions (foreign key)
    await createSubmission();
    console.log('✅ Database initialization complete');
  } catch (err) {
    console.error('❌ Database initialization failed:', err.message);
    throw err;
  }
}

module.exports = { pool, initDatabase };