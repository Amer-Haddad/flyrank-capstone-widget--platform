## Problem
Widget owners need a secure and tenant-isolated way to capture leads from any website without trusting the client.

## Data model (Phase 1.2)
- Tenant: account boundary for isolation.
- User: authenticated owner inside a tenant.
- Widget: embeddable unit owned by a tenant.
- WidgetField: dynamic form field definition for a widget.
- Submission: captured visitor payload for a widget.
- SubmissionEvent: non-critical side effect tracking.
- IdempotencyKey: deduplication guard for retried operations.

## Layer sketch
Express middleware -> Controllers -> Services -> Repositories -> PostgreSQL

## API contract

Base URL: `http://localhost:3000`

All JSON responses use the success/error envelopes below. Protected endpoints
require `Authorization: Bearer <JWT>`. The public submission endpoint accepts
cross-origin requests and does not require owner authentication.

### 0) Health

- `GET /api/health`

Returns the API and database health status. This endpoint does not require
authentication.

### 1) Owner registration

- `OPTIONS /api/auth/register`
- `POST /api/auth/register`

Request body:

```json
{
  "tenantName": "Example Company",
  "tenantSlug": "example-company",
  "email": "owner@example.com",
  "password": "at-least-12-characters"
}
```

Registration creates the tenant and its first owner transactionally and
returns the created records plus a one-hour JWT. Duplicate tenant or owner
records return `409 REGISTRATION_CONFLICT`.

### 2) Owner-authenticated widget management
- `POST /api/widgets`
- `GET /api/widgets`
- `GET /api/widgets/:id`
- `PATCH /api/widgets/:id`
- `DELETE /api/widgets/:id`

Rules:
- Requires owner authentication on every endpoint.
- Every query is tenant-scoped (`tenant_id`) to enforce isolation.
- `POST` requires `type`, `title`, and valid dynamic `fields`.
- `PATCH` updates supplied widget properties and increments its version.
- `DELETE` returns `204 No Content`.

Widget fields contain `key`, `label`, `type` (`text` or `email`), `required`,
`order`, and optional validation rules.

### 3) Public widget delivery
- `GET /widget.js?id=<widgetId>&v=<bundleVersion>`
- `GET /api/public/widgets/:id/config`

Rules:
- Public read-only endpoints.
- Cache behavior:
  - `widget.js`: long-lived cache + versioned URL.
  - config endpoint: short-lived cache.

### 4) Public submission ingestion
- `OPTIONS /api/public/submissions` (preflight)
- `POST /api/public/submissions`

Rules:
- CORS enabled for cross-origin requests.
- Boundary validation before business logic.
- Rate limiting + spam checks before persistence.
- Geo enrichment via provider fallback chain.
- Side effects cannot break successful submission storage.

Request body:

```json
{
  "widgetId": "widget-uuid",
  "payload": {
    "name": "Visitor Name",
    "email": "visitor@example.com"
  }
}
```

An optional `Idempotency-Key` header makes retries safe for 24 hours. A new
submission returns `201`; an identical replay returns `200`; a reused key with
different data returns `409`.

### 5) Owner dashboard analytics
- `GET /api/dashboard/submissions`
- `GET /api/dashboard/stats/overview`
- `GET /api/dashboard/stats/widgets`
- `GET /api/dashboard/stats/geo`

Rules:
- Requires owner authentication.
- Tenant-scoped reads only.
- `GET /api/dashboard/submissions` supports `widgetId`, `ip`, `from`, `to`,
  `page`, and `pageSize`. The `ip` filter is an exact match.
- The response contains `items` with `id`, `widget_id`, `tenant_id`, `payload`,
  `ip`, `user_agent`, `geo`, `status`, and `created_at`, plus pagination data.
- Overview returns totals and daily counts.
- Widget statistics group request counts by widget.
- Geo statistics group request counts by country, region, and city.

Example dashboard request:

```text
GET /api/dashboard/submissions?page=1&pageSize=50&ip=203.0.113.10
```

## Response format contract

### Success
```json
{
  "success": true,
  "data": {}
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Payload validation failed.",
    "details": []
  }
}
```

## Status code matrix
- `200 OK`: successful read/list operation.
- `201 Created`: successful create operation.
- `204 No Content`: successful delete operation.
- `400 Bad Request`: malformed request shape or invalid query params.
- `401 Unauthorized`: missing or invalid auth credentials.
- `403 Forbidden`: authenticated but not allowed for resource.
- `404 Not Found`: resource does not exist in tenant scope.
- `413 Payload Too Large`: request body exceeds configured limits.
- `429 Too Many Requests`: rate limit triggered.
- `409 Conflict`: duplicate/idempotency conflict or registration conflict.
- `500 Internal Server Error`: unexpected server error.
- `503 Service Unavailable`: optional for temporary dependency outages on non-core paths.

## Explicit non-goal
Advanced no-code visual builder features (drag-and-drop editor, themes marketplace, A/B campaign automation) are out of scope for this capstone.