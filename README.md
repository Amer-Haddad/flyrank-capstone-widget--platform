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

## Architecture

```text
Browser / embedded widget
        |
        v
Express routes + middleware (CORS, validation, rate limits, errors)
        |
        v
Controllers -> Services -> Repositories -> PostgreSQL
                         |
                         +-> geo provider fallback
                         +-> asynchronous email side effect
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

The migration command applies `src/database/schema.sql`. There is no separate
seed command in the current implementation; tests provide deterministic
repository fixtures.

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

## Implemented endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Runtime health check |
| `POST` | `/api/widgets` | Authenticated widget creation; returns an embed snippet |
| `GET` | `/api/widgets` | Authenticated tenant-scoped widget list |
| `GET` | `/api/widgets/:id` | Authenticated tenant-scoped widget details and embed snippet |
| `GET` | `/widget.js?id=<widgetId>&v=<version>` | Versioned embeddable widget bundle |
| `GET` | `/api/public/widgets/:id/config` | Public widget configuration |
| `OPTIONS` | `/api/public/submissions` | CORS preflight |
| `POST` | `/api/public/submissions` | Validated, rate-limited lead submission |

## Limitations

- Owner authentication, widget CRUD, and dashboard analytics are documented
  contracts but are not implemented in this milestone.
- The widget client is intentionally minimal and supports the configured
  text/email fields without an advanced visual builder.
- Geo enrichment and email notification are best-effort dependencies; the
  submission record remains the source of truth when they fail.

## Acceptance verification

```bash
npm test
npm run serve:widget-test
```

With the application running on port 3000, open
`http://localhost:5500/widget-test.html` to verify cross-origin widget
delivery and form submission.

Widget management responses include an `embedSnippet` value in this format:

```html
<script src="http://localhost:3000/widget.js?id=<widgetId>&v=<version>"></script>
```

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