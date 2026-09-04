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

## Widget test page

Start the application on port 3000, then serve the plain HTML test page from a
different origin and port:

```bash
npm run serve:widget-test
```

Open `http://localhost:5500/widget-test.html`. The page loads the versioned
widget bundle from `http://localhost:3000`, fetches its public configuration,
and renders the submission form.

## Design and API contract

Phase 1 design, API contracts, response format, status-code matrix, and explicit non-goal are documented in [DESIGN.md](C:/Users/USER/Desktop/flyrank-capstone-widget--platform/DESIGN.md).

## Phase 1.4 Gate output - One-page design

### Problem
Widget owners need a secure, tenant-isolated backend to embed widgets on any website and collect leads from untrusted public traffic.

### Core architecture
- Layered backend: middleware -> controllers -> services -> repositories -> PostgreSQL.
- Three request paths:
  - Owner path (authenticated widget management + dashboard)
  - Public delivery path (widget script + widget config)
  - Public ingestion path (cross-origin submissions)

### Data model
- `tenants`, `users`, `widgets`, `widget_fields`, `submissions`, `submission_events`, `idempotency_keys`.
- Every tenant-owned table includes `tenant_id` for strict isolation.
- Tenant and analytics indexes are included in [schema.sql](C:/Users/USER/Desktop/flyrank-capstone-widget--platform/src/database/schema.sql).

### API surface (contract)
- Owner-authenticated:
  - `POST /api/widgets`
  - `GET /api/widgets`
  - `GET /api/widgets/:id`
  - `PATCH /api/widgets/:id`
  - `DELETE /api/widgets/:id`
  - `GET /api/dashboard/*`
- Public:
  - `GET /widget.js?id=<widgetId>&v=<bundleVersion>`
  - `GET /api/public/widgets/:id/config`
  - `OPTIONS /api/public/submissions`
  - `POST /api/public/submissions`

### Security and resilience decisions
- CORS + preflight handling for public submissions.
- Boundary validation before business logic.
- Rate limiting and spam control before persistence.
- Geo enrichment with fallback chain.
- Side effects are non-blocking (submission success does not depend on email/webhook success).

### Response contract
- Success:
  - `{ "success": true, "data": ... }`
- Error:
  - `{ "success": false, "error": { "code": "...", "message": "...", "details": [] } }`

### Explicit non-goal
No advanced no-code visual builder (drag-and-drop editor, theme marketplace, campaign automation) in this capstone scope.