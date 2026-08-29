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

## API contract (Phase 1.3)

### 1) Owner-authenticated widget management
- `POST /api/widgets`
- `GET /api/widgets`
- `GET /api/widgets/:id`
- `PATCH /api/widgets/:id`
- `DELETE /api/widgets/:id`

Rules:
- Requires owner authentication on every endpoint.
- Every query is tenant-scoped (`tenant_id`) to enforce isolation.

### 2) Public widget delivery
- `GET /widget.js?id=<widgetId>&v=<bundleVersion>`
- `GET /api/public/widgets/:id/config`

Rules:
- Public read-only endpoints.
- Cache behavior:
  - `widget.js`: long-lived cache + versioned URL.
  - config endpoint: short-lived cache.

### 3) Public submission ingestion
- `OPTIONS /api/public/submissions` (preflight)
- `POST /api/public/submissions`

Rules:
- CORS enabled for cross-origin requests.
- Boundary validation before business logic.
- Rate limiting + spam checks before persistence.
- Geo enrichment via provider fallback chain.
- Side effects cannot break successful submission storage.

### 4) Owner dashboard analytics
- `GET /api/dashboard/submissions`
- `GET /api/dashboard/stats/overview`
- `GET /api/dashboard/stats/widgets`
- `GET /api/dashboard/stats/geo`

Rules:
- Requires owner authentication.
- Tenant-scoped reads only.

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
- `500 Internal Server Error`: unexpected server error.
- `503 Service Unavailable`: optional for temporary dependency outages on non-core paths.

## Explicit non-goal
Advanced no-code visual builder features (drag-and-drop editor, themes marketplace, A/B campaign automation) are out of scope for this capstone.