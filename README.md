# FlyRank Widget Platform

An embeddable widget and lead-capture platform built with Node.js, Express,
and PostgreSQL. Widget owners can manage tenant-isolated widgets, embed them
on external websites, collect submissions, and review dashboard analytics.

## Features

- Embeddable, versioned widget bundle
- Public widget configuration endpoint with cache headers and CORS
- Cross-origin submission API with validation and payload limits
- Per-IP and per-widget rate limiting
- Honeypot spam protection
- Geo-enrichment provider fallback
- Asynchronous email side effects with retries
- Idempotent public submissions
- JWT-protected owner APIs
- Tenant-scoped widget management and dashboard queries
- Submission, widget, and geo analytics

## Technology

- Node.js (LTS recommended)
- Express 5
- PostgreSQL
- JWT (`HS256`) authentication
- Nodemailer for email notifications

## Architecture

```text
Embedded browser widget
          |
          v
Express routes and middleware
(authentication, CORS, validation, rate limits, errors)
          |
          v
Controllers -> Services -> Repositories -> PostgreSQL
                         |
                         +-> Geo provider fallback
                         +-> Asynchronous side-effect jobs
```

The application is organized into `routes`, `middleware`, `controllers`,
`services`, `repositories`, `jobs`, `config`, and `database` layers.

## Prerequisites

- Node.js and npm
- Docker Desktop (for the local PostgreSQL container)

## Installation

```bash
npm install
```

Copy `.env.example` to `.env` and set environment-specific values. At minimum,
configure a random `JWT_SECRET` containing at least 32 characters and a valid
`DATABASE_URL`.

## Database setup

Start PostgreSQL and apply the schema:

```bash
docker compose up -d postgres
npm run migrate
```

The migration command applies [schema.sql](C:/Users/USER/Desktop/flyrank-capstone-widget--platform/src/database/schema.sql).
There is no user-registration or seed command in this repository. Applications
integrating the platform must provision tenants and users through their own
administration workflow.

## Running the application

Development mode:

```bash
npm run dev
```

Production-style start:

```bash
npm start
```

The API listens on port `3000` by default. Set `PORT` to use another port.

## Authentication

Owner and dashboard endpoints require an `HS256` JWT in the following header:

```http
Authorization: Bearer <token>
```

The token must contain:

- `sub` or `userId`: authenticated user identifier
- `tenantId`: tenant identifier used for all protected reads and writes
- `role`: optional role claim; defaults to `owner`

`JWT_ISSUER` is optional. When configured, tokens must contain the matching
issuer claim.

Example token generation for local development:

```bash
node -e "require('dotenv').config(); console.log(require('jsonwebtoken').sign({sub:'demo-user',tenantId:'demo-tenant',role:'owner'}, process.env.JWT_SECRET, {algorithm:'HS256', issuer:process.env.JWT_ISSUER}))"
```

Do not use sample claims or development secrets in production.

## API reference

All JSON responses use the following envelope:

```json
{
  "success": true,
  "data": {}
}
```

Errors use:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable explanation.",
    "details": []
  }
}
```

### System and public endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Service health check |
| `GET` | `/widget.js?id=<widgetId>&v=<version>` | Versioned widget bundle |
| `GET` | `/api/public/widgets/:id/config` | Public widget configuration |
| `OPTIONS` | `/api/public/submissions` | Submission CORS preflight |
| `POST` | `/api/public/submissions` | Validated public lead submission |

### Protected widget management

All endpoints in this section require authentication and tenant context.

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/widgets` | Create a widget and its fields |
| `GET` | `/api/widgets` | List widgets for the authenticated tenant |
| `GET` | `/api/widgets/:id` | Read a tenant-owned widget |
| `PATCH` | `/api/widgets/:id` | Update a tenant-owned widget |
| `DELETE` | `/api/widgets/:id` | Delete a tenant-owned widget |

Create, read, and list responses include an `embedSnippet` value:

```html
<script src="http://localhost:3000/widget.js?id=<widgetId>&v=<version>"></script>
```

### Protected dashboard

All dashboard endpoints require authentication and only return records for the
authenticated tenant.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/dashboard/submissions` | Paginated submissions |
| `GET` | `/api/dashboard/stats/overview` | Total and daily submission counts |
| `GET` | `/api/dashboard/stats/widgets` | Submission totals grouped by widget |
| `GET` | `/api/dashboard/stats/geo` | Submission totals grouped by country, region, and city |

Dashboard queries support optional `widgetId`, `from`, and `to` filters.
Submission lists support `page` and `pageSize`; page size is limited to 100.
Grouped widget and geo analytics are limited to 100 result rows.

Example:

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/dashboard/submissions?page=1&pageSize=25"

curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/dashboard/stats/overview?from=2026-09-01"
```

## Embedding and browser verification

Start the API, then serve the second-origin test page:

```bash
npm run serve:widget-test
```

Open `http://localhost:5500/widget-test.html`. The page loads the widget from
port `3000`, fetches public configuration, renders the form, and exercises
cross-origin submission behavior.

## Reliability and security behavior

- Submission persistence is the source of truth.
- Geo and email failures do not invalidate a successful submission.
- Email side effects run asynchronously and retry before recording failure.
- Reusing an `Idempotency-Key` with the same request replays the stored result.
- Reusing an idempotency key with different request data returns a conflict.
- Missing or invalid owner credentials return `401 UNAUTHORIZED`.
- Cross-tenant resource access is treated as not found.
- Oversized payloads return `413 PAYLOAD_TOO_LARGE`.
- Rate-limit violations return `429`.

## Testing and acceptance

Run the complete automated suite:

```bash
npm test
```

The current acceptance suite covers authentication, tenant isolation, widget
CRUD, widget delivery, CORS, validation, abuse protection, geo fallback,
asynchronous side effects, idempotency, dashboard submissions, and analytics.

See [DESIGN.md](C:/Users/USER/Desktop/flyrank-capstone-widget--platform/DESIGN.md),
[BUILDLOG.md](C:/Users/USER/Desktop/flyrank-capstone-widget--platform/BUILDLOG.md),
and [EVIDENCE.md](C:/Users/USER/Desktop/flyrank-capstone-widget--platform/EVIDENCE.md)
for the detailed contract, implementation history, and verification evidence.

## Configuration reference

Available configuration variables and safe placeholders are documented in
[.env.example](C:/Users/USER/Desktop/flyrank-capstone-widget--platform/.env.example).
Never commit `.env`, credentials, tokens, or provider secrets.

## Scope

This capstone intentionally excludes an advanced no-code visual builder,
drag-and-drop editing, theme marketplaces, and campaign automation.
