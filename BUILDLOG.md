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

## 2026-09-04 - Phase 3.2 minimal widget client and second-origin test page

- Confirmed the widget bundle fetches public configuration and renders fields dynamically.
- Confirmed the rendered form submits JSON to `POST /api/public/submissions`.
- Added `npm run serve:widget-test`, a dependency-free static server for `widget-test.html`.
- The test page is served on port 5500 while the widget API runs on port 3000, providing a separate-origin CORS test.
- Extended widget delivery tests to verify renderer and submission endpoint code are present in the delivered bundle.

### Phase 3.2 validation evidence

```text
> npm run serve:widget-test
Widget test page is running at http://localhost:5500/widget-test.html
GET /widget-test.html -> 200 text/html; charset=utf-8

> npm test
ℹ tests 9
ℹ pass 9
ℹ fail 0
```

## 2026-09-04 - Phase 3.4 evidence and documentation completion

- Finalized `README.md` with the layered architecture diagram, setup/migration instructions, implemented endpoint table, limitations, and acceptance commands.
- Finalized `capstone.yaml` with executable test and second-origin page probes plus the implemented public endpoint probes.
- Completed the `EVIDENCE.md` requirement checklist for submission success, malformed/oversized payloads, abuse protection, geo fallback, side-effect failure, honeypot blocking, widget delivery, and second-origin testing.
- Verified the complete automated suite: 10 tests passed and 0 failed, including explicit `413 PAYLOAD_TOO_LARGE` coverage.

## 2026-09-04 - Phase 4.1 authentication foundation

- Added JWT configuration validation requiring a 32-character `JWT_SECRET`.
- Added optional issuer validation through `JWT_ISSUER`.
- Added bearer-token authentication middleware for protected owner routes.
- Restricted accepted tokens to the `HS256` algorithm.
- Required `sub`/`userId` and `tenantId` claims and exposed validated owner context as `req.owner`.
- Added tests for missing credentials, malformed/invalid tokens, valid owner tokens, and missing tenant claims.

### Runtime evidence captured

```text
✔ protected routes reject requests without credentials
✔ protected routes reject malformed and invalid bearer tokens
✔ protected routes accept a valid owner token and expose tenant context
✔ protected routes reject tokens missing tenant claims
ℹ tests 14
ℹ pass 14
ℹ fail 0
```

## 2026-09-04 - Phase 4.5 embed snippet generation

- Confirmed the reusable embed helper generates a complete `<script>` tag from `PUBLIC_BASE_URL`, widget ID, and bundle version.
- Confirmed create, list, and read widget responses include the versioned `embedSnippet`.
- Confirmed widget IDs are URL-encoded in generated snippets.
- Documented the snippet contract in `README.md`.

## 2026-09-04 - Phase 4.6 public configuration CORS

- Applied a public CORS policy to `GET /api/public/widgets/:id/config`.
- Configuration requests now return the requesting origin in `Access-Control-Allow-Origin`.
- Added a browser-compatible cross-origin config test using the second-origin port.

### Runtime evidence captured

```text
GET /api/public/widgets/11111111-1111-4111-8111-111111111111/config 200
Access-Control-Allow-Origin: http://localhost:5500
✔ GET /api/public/widgets/:id/config returns public config JSON
ℹ tests 25
ℹ pass 25
ℹ fail 0
```

## 2026-09-04 - Phase 4.7 submission idempotency

- Added `Idempotency-Key` support to public submissions and exposed it in CORS allowed headers.
- Added SHA-256 request hashing over the widget ID and payload.
- Reserved keys are scoped to the resolved tenant and widget.
- Identical completed requests replay the stored response with `200` and do not create another submission.
- Reuse with a different request body returns `409 IDEMPOTENCY_CONFLICT`; concurrent in-progress reuse returns `409 IDEMPOTENCY_IN_PROGRESS`.
- Stored idempotency records expire after 24 hours.

### Runtime evidence captured

```text
POST /api/public/submissions 201
POST /api/public/submissions 200
✔ POST /api/public/submissions replays an identical idempotent request
ℹ tests 26
ℹ pass 26
ℹ fail 0
```

## 2026-09-04 - Phase 4.8 background job wiring

- Replaced the placeholder job registration with an explicit in-process job registry and dispatcher.
- Registered the submission side-effect processor as the `submission-side-effects` background job.
- Public submission persistence remains synchronous, while email processing is dispatched with `setImmediate`.
- Job failures are surfaced through job-scoped error logs and do not reject the submission request.
- Added a direct asynchronous job execution test.

## 2026-09-04 - Phase 4.9 dashboard submissions API

- Added authenticated `GET /api/dashboard/submissions`.
- Added tenant-scoped submission listing with optional widget, date-range, and pagination filters.
- Added stable `{ items, pagination }` response data.
- Added validation for page, page size, widget UUID, and ISO date filters.
- Added tests for tenant context, pagination, unauthorized access, and invalid queries.

## 2026-09-04 - Phase 4.10 dashboard analytics APIs

- Added authenticated tenant-scoped overview, widget, and geo aggregation endpoints.
- Added optional `widgetId`, `from`, and `to` filters to analytics queries.
- Added daily submission counts, per-widget totals, and normalized geo breakdowns.
- Capped widget and geo result sets at 100 rows and added validation for analytics filters.
- Added tests for analytics responses, tenant context, authentication, and invalid filters.

## 2026-09-04 - Phase 4.11 documentation and acceptance evidence

- Updated `README.md` with JWT setup, protected-route examples, dashboard examples, and migration/seed limitations.
- Updated `capstone.yaml` with widget CRUD and dashboard endpoint probes and corrected the widget test port to 5500.
- Marked authentication, tenant isolation, idempotency, dashboard visibility, and analytics evidence as complete.
- AI assistance: Copilot SDK in VS Code was used for implementation, documentation, and test review.
- Estimated usage cost: not metered by the repository or local test tooling; no cost figure is available from this workspace.

### Runtime evidence captured

```text
✔ registered jobs execute asynchronously after enqueue
✔ POST /api/public/submissions does not fail when async email side effect fails
ℹ tests 33
ℹ pass 33
ℹ fail 0
```

## 2026-09-04 - Phase 4.2 tenant context and isolation

- Added tenant context middleware that derives `req.tenant` only from authenticated owner claims.
- Added tenant-scoped widget lookup using both `widget_id` and `tenant_id`.
- Added tenant-scoped submission listing with optional widget filtering and pagination parameters.
- Added tests proving missing tenant context is rejected and cross-tenant widget lookups return no record.

## 2026-09-04 - Phase 4.3 widget management create/read

- Added authenticated `POST /api/widgets`, `GET /api/widgets`, and `GET /api/widgets/:id` routes.
- Added boundary validation for widget metadata and field definitions.
- Added transactional widget and widget-field persistence scoped to the authenticated tenant.
- Added embed snippet generation to widget responses.
- Added tests for create/read/list success, invalid fields, and unauthenticated access.

## 2026-09-04 - Phase 4.4 widget management update/delete

- Added tenant-scoped `PATCH /api/widgets/:id` and `DELETE /api/widgets/:id`.
- Configuration updates increment the widget version to invalidate versioned delivery URLs.
- Field updates replace the tenant-scoped field set transactionally with the widget update.
- Missing or cross-tenant resources return `404 WIDGET_NOT_FOUND`.
- Added update and delete endpoint tests.

### Runtime evidence captured

```text
✔ widget update returns the new version and remains tenant-scoped
✔ widget delete returns 204 and requires tenant-scoped deletion
```

### Runtime evidence captured

```text
✔ widget create returns 201 and an embed snippet
✔ widget list and read routes use the authenticated tenant
✔ widget management routes reject unauthenticated requests
✔ widget creation rejects invalid field definitions
ℹ tests 25
ℹ pass 25
ℹ fail 0
```