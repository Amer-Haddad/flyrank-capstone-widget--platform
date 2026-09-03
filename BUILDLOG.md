# BUILDLOG

## 2026-08-29 - Phase 1.1 baseline

- Scaffolded layered Node.js/Express architecture.
- Added app/server bootstrap and global error handling.
- Added health endpoint to verify runtime wiring.
- Updated required baseline docs and manifest skeleton.

## 2026-08-29 - Phase 1.2 simplification 

- Switched to a schema workflow based on `src/database/schema.sql`.
- Added `src/database/apply-schema.js` to apply the full schema directly.
- Added `src/database/pool.js` to centralize database connection.
- Updated `npm run migrate` to run `node src/database/apply-schema.js`.
- Verified `npm run migrate` prints `Database schema applied successfully.`

## 2026-08-29 - Phase 1.3 API contract definition

- Expanded `DESIGN.md` with all 4 request paths and endpoint contracts.
- Defined success/error response shape contract.
- Added status-code matrix for expected API behavior.
- Added explicit non-goal statement for scope control.

## 2026-08-29 - Phase 1.4 gate output

- Added a one-page design section directly in `README.md`.
- Included problem, architecture, data model, API surface, resilience decisions, response contract, and non-goal.

## 2026-09-03 - Phase 2.1 public submission endpoint

- Implemented `POST /api/public/submissions` in the public route layer with CORS and preflight support.
- Added request validation for `widgetId`, payload object schema, safe field limits, and honeypot spam detection.
- Added per-IP and per-widget rate limiting to enforce 429 behavior under burst traffic.
- Added `express.json` and URL-encoded request boundary enforcement for oversized payload rejection.
- Verified the endpoint returns `201 Created` on valid requests and `400 Bad Request` for malformed payloads.
- Verified the route rejects spam honeypot values before persistence.
- Verified repeated requests from the same client are throttled with `429 Too Many Requests`.

## 2026-09-03 - Phase 2.2 abuse protection

- Added a dedicated public submission IP limiter with a 60s window and max 20 attempts.
- Added a widget-scoped limiter keyed by `clientIP + widgetId` with a 60s window and max 10 attempts.
- Added honeypot detection for hidden fields such as `website` and `company` to block obvious spam submissions.
- Kept validation and rate limiting in the request path before DB persistence.
- Confirmed blocked requests return consistent `429 RATE_LIMITED` JSON payloads.
- Confirmed honeypot triggers return `400 VALIDATION_ERROR` before the submission reaches persistence.

## 2026-09-03 - Phase 2.3 enrichment fallback chain

- Added `src/services/geo-enrichment.service.js` with a provider A/B fallback chain.
- Provider A: `ip-api.com` is attempted first.
- Provider B: `ipapi.co` is attempted only if provider A fails.
- If both providers fail, submission creation still proceeds without geo data and does not fail the HTTP request.
- Added `GEO_ENRICHMENT_FAILURE_MODE` support for deterministic testing and evidence capture.
- Wired the enrichment result into the submissions insert path so `submissions.geo` stores normalized location data when available.

## 2026-09-03 - Phase 2.4 safe side effects and email notification

- Added a non-blocking async email side effect using `src/services/submission-side-effects.service.js`.
- The email job is kicked off immediately after a successful submission insert, but it does not block the client response.
- The side effect includes retry logic (3 attempts) and writes a failure record to `submission_events` when the email delivery fails.
- Added the configured testing recipient and Gmail sender values to `.env` only.
- Kept the email workflow safe: delivery problems are logged and recorded, but the original submission still returns a successful `201` response.

## 2026-09-03 - Phase 2.5 gate output

- Verified the cross-origin submission path successfully stores the enriched submission row and returns a successful response.
- Verified the row persists even when geo provider fallback is needed and when the async email dependency fails.
- Confirmed the final gate requirement: a public submission is the source of truth and dependency failures do not break it.

## 2026-09-03 - Phase 3.1 widget delivery and caching

- Added a public widget JS bundle at `/widget.js` with a versioned URL contract: `?id=<widgetId>&v=<version>`.
- Added a public config endpoint at `/api/public/widgets/:id/config` that returns widget metadata and form field definitions.
- Enforced cache timing per requirement: immutable 1-year cache for the script, short-lived cache for config data.
- The widget script dynamically fetches config and renders a minimal form that submits back to `/api/public/submissions`.

![alt text](<Screenshot 2026-09-03 184530.png>)

### Validation command

```bash
cd C:\Users\USER\Desktop\flyrank-capstone-widget--platform
node --test test/widget-delivery.test.js
```

### Runtime evidence captured

```text
GET /widget.js?id=11111111-1111-4111-8111-111111111111&v=7 200 1.563 ms - 4407
✔ GET /widget.js returns a versioned widget script with long cache headers
GET /api/public/widgets/11111111-1111-4111-8111-111111111111/config 200 1.036 ms - 511
✔ GET /api/public/widgets/:id/config returns public config JSON
ℹ tests 2
ℹ pass 2
ℹ fail 0
```