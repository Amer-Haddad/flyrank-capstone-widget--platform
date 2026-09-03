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

### Validation command

```bash
cd C:\Users\USER\Desktop\flyrank-capstone-widget--platform
node --test test/public-submissions.test.js
```

### Runtime evidence captured

```text
POST /api/public/submissions 201 17.576 ms - 347
✔ POST /api/public/submissions creates a submission for valid payloads
POST /api/public/submissions 400 2.454 ms - 195
✔ POST /api/public/submissions rejects invalid payloads with 400
POST /api/public/submissions 400 1.390 ms - 214
✔ POST /api/public/submissions blocks spam honeypots
POST /api/public/submissions 429 0.483 ms - 115
✔ POST /api/public/submissions rate-limits repeated requests
ℹ tests 4
ℹ pass 4
ℹ fail 0
```
