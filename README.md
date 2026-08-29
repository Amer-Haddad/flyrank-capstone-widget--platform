# FlyRank Capstone - Embeddable Widget Platform

## Phase 1.1 status

Repository baseline and layered Node.js architecture are scaffolded.

## Phase 1.2 status

Data model and SQL migrations are added for:
- tenants
- users
- widgets
- widget_fields
- submissions
- submission_events
- idempotency_keys
- schema_migrations (migration tracking)

## Stack

- Node.js (CommonJS)
- Express
- PostgreSQL (via Docker Compose)

## Current architecture skeleton

```text
src/
  app.js
  server.js
  config/
  controllers/
  middleware/
  models/
  repositories/
  routes/
  services/
  jobs/
```

## Run

```bash
npm install
npm run dev
```

## Database migration

```bash
docker compose up -d postgres
npm run migrate
```

Health endpoint:

```bash
GET /api/health
```