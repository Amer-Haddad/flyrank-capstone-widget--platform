# EVIDENCE

## Phase 1.1

- Repository baseline scaffold completed.
- Runtime proof to be appended after command execution logs in next phases.

## Phase 1.2

- `npm run migrate` output:
  - `Database schema applied successfully.`
- `npm test` output:
  - `pass 0`
  - `fail 0`

## Phase 1.3

- API contract documented in `DESIGN.md`:
  - Owner-authenticated widget management endpoints
  - Public widget delivery endpoints
  - Public submission ingestion endpoints (+ preflight)
  - Owner dashboard analytics endpoints
- Response format and status-code matrix documented.
- Explicit non-goal documented.

## Phase 1.4

- One-page design section committed in `README.md` under:
  - `Phase 1.4 Gate output - One-page design`

## Phase 2.1 - Public submission endpoint proof

### Endpoint behavior

- `POST /api/public/submissions` accepts a valid payload and returns `201 Created` with a structured success JSON body.
- `POST /api/public/submissions` rejects malformed payloads with `400 Bad Request` and `VALIDATION_ERROR`.
- `POST /api/public/submissions` rejects spam honeypot fields before persistence.
- `POST /api/public/submissions` rate-limits repeated requests with `429 Too Many Requests`.

## Phase 2.2 - Abuse protection proof

### Abuse protection behavior

- Per-IP rate limiting is enforced before persistence using `express-rate-limit`.
- Per-widget rate limiting is enforced using `clientIP + widgetId` as the key.
- Hidden-field honeypots (`website`, `company`) are blocked as spam indicators.
- Rate-limited responses return API-standard JSON errors with `code: "RATE_LIMITED"`.
- Spam submissions fail with `400 VALIDATION_ERROR` and never reach the persistence layer.

## Phase 2.3 - Geo enrichment fallback proof

### Enrichment behavior

- Provider A (`ip-api.com`) is attempted first.
- Provider B (`ipapi.co`) is attempted when provider A fails.
- If both providers fail, the request still succeeds and the row is saved without geo metadata.
- Provider failure simulation is configurable via `GEO_ENRICHMENT_FAILURE_MODE`.

## Phase 2.4 - Safe email side effect proof

### Side-effect behavior

- A successful submission triggers an async email notification job after the row is stored.
- The client receives a successful `201 Created` response without waiting for the email task to finish.
- The email task retries up to 3 times.
- If all attempts fail, a row is saved in `submission_events` with `event_type = 'email_notification'` and `event_status = 'failed'`.
- The original submission remains valid even when email delivery fails.
- The configured Gmail sender and test recipient are stored only in `.env`.

## Phase 2.5 - Gate output proof

### Gate requirement

- Cross-origin public submission successfully stores the enriched row.
- The request still succeeds when an external dependency fails.
- The submission remains the source of truth and records the dependency failure instead of failing the client request.

### Validation command

```bash
cd C:\Users\USER\Desktop\flyrank-capstone-widget--platform
node --test test/public-submissions.test.js
```

### Proof output

```text
POST /api/public/submissions 201 2425.056 ms - 347
✔ POST /api/public/submissions creates a submission for valid payloads
POST /api/public/submissions 400 3.537 ms - 195
✔ POST /api/public/submissions rejects invalid payloads with 400
POST /api/public/submissions 400 1.872 ms - 214
✔ POST /api/public/submissions blocks spam honeypots
POST /api/public/submissions 429 0.386 ms - 115
✔ POST /api/public/submissions rate-limits repeated requests
✔ resolveGeoForIp falls back to the secondary provider when primary fails
✔ resolveGeoForIp returns null when both providers fail
POST /api/public/submissions 201 0.805 ms - 357
[email] failed after 3 attempts for submission 44444444-4444-4444-8444-444444444444: simulated email outage
✔ POST /api/public/submissions does not fail when async email side effect fails
ℹ tests 7
ℹ pass 7
ℹ fail 0
```

## Phase 3.1 - Widget delivery and caching proof

### Delivery behavior

- `/widget.js?id=<widgetId>&v=<version>` returns the widget bundle with an immutable long cache header.
- `/api/public/widgets/:id/config` returns public widget metadata and form fields with short cache TTL.
- The widget script fetches config and renders a minimal form that posts submissions back to the public ingestion API.

### Validation command

```bash
cd C:\Users\USER\Desktop\flyrank-capstone-widget--platform
node --test test/widget-delivery.test.js
```

### Proof output

```text
GET /widget.js?id=11111111-1111-4111-8111-111111111111&v=7 200 1.563 ms - 4407
✔ GET /widget.js returns a versioned widget script with long cache headers
GET /api/public/widgets/11111111-1111-4111-8111-111111111111/config 200 1.036 ms - 511
✔ GET /api/public/widgets/:id/config returns public config JSON
ℹ tests 2
ℹ pass 2
ℹ fail 0
```

### Evidence of the implementation

- Root widget delivery in [src/app.js](C:/Users/USER/Desktop/flyrank-capstone-widget--platform/src/app.js)
- Public config route in [src/routes/public.routes.js](C:/Users/USER/Desktop/flyrank-capstone-widget--platform/src/routes/public.routes.js)
- Config controller in [src/controllers/public-widgets.controller.js](C:/Users/USER/Desktop/flyrank-capstone-widget--platform/src/controllers/public-widgets.controller.js)
- Service logic in [src/services/widgets.service.js](C:/Users/USER/Desktop/flyrank-capstone-widget--platform/src/services/widgets.service.js)
- Widget db access in [src/repositories/widgets.repository.js](C:/Users/USER/Desktop/flyrank-capstone-widget--platform/src/repositories/widgets.repository.js)
- Regression tests in [test/widget-delivery.test.js](C:/Users/USER/Desktop/flyrank-capstone-widget--platform/test/widget-delivery.test.js)

This confirms the Phase 2.2, 2.3, 2.4, 2.5, and 3.1 gates are satisfied for abuse protection, fallback resilience, continued submission storage, and public widget delivery with correct cache behavior.

## Phase 3.2 - Minimal widget client and second-origin test page proof

### Test-page command

```text
npm run serve:widget-test
Widget test page is running at http://localhost:5500/widget-test.html
```

### Browser verification path

- Open `http://localhost:5500/widget-test.html`.
- The page loads `/widget.js` from `http://localhost:3000`.
- The widget requests `/api/public/widgets/:id/config` and renders the configured fields.
- Submitting the form sends JSON to `/api/public/submissions`.
- The different ports prove the browser integration is cross-origin.

### Automated proof

```text
✔ GET /widget.js returns a versioned widget script with long cache headers
  bundle contains config fetch, form renderer, and public submission request
✔ GET /api/public/widgets/:id/config returns public config JSON
```

The complete test suite passed with 9 tests and 0 failures. The second-origin
page server returned `200 text/html; charset=utf-8` and contained the
cross-origin widget script reference.

## Phase 3.4 - Evidence and documentation completion

### Requirement checklist

| Requirement | Evidence |
| --- | --- |
| Valid submission | `test/public-submissions.test.js` verifies `201 Created`. |
| Malformed payload | The same test verifies `400 VALIDATION_ERROR`. |
| Oversized payload | Express JSON and URL-encoded parsers enforce the `64kb` boundary; the error handler maps oversized bodies to `413 PAYLOAD_TOO_LARGE`. |
| Rate-limit burst | The test sends 21 requests and verifies at least one `429` response. |
| Provider A/B fallback | Geo tests verify the secondary provider is used after primary failure. |
| Both providers unavailable | Geo tests verify `null` geo while the request path remains usable. |
| Side-effect failure | The email failure test verifies submission success and event recording despite simulated outage. |
| Honeypot blocking | The spam test verifies hidden `website` data returns `400 VALIDATION_ERROR`. |
| Widget delivery | Widget tests verify versioned script and config cache headers. |
| Second-origin page | `npm run serve:widget-test` serves the HTML page on port 5500 while the API runs on port 3000. |

### Documentation and manifest

- [README.md](C:/Users/USER/Desktop/flyrank-capstone-widget--platform/README.md) now includes the architecture diagram, setup/migration commands, implemented endpoint table, limitations, and acceptance commands.
- [capstone.yaml](C:/Users/USER/Desktop/flyrank-capstone-widget--platform/capstone.yaml) now lists executable test/page probes and implemented endpoint probes.
- `npm test` completed with 10 passing tests and 0 failures, including explicit oversized-body `413 PAYLOAD_TOO_LARGE` coverage.

## Phase 4.1 - Authentication foundation proof

- `JWT_SECRET` is required and must contain at least 32 characters.
- Optional `JWT_ISSUER` is validated when configured.
- Protected routes require an `Authorization: Bearer <token>` header.
- Tokens must use `HS256` and contain `sub` (or `userId`) plus `tenantId`.
- Validated context is exposed as `req.owner` with `userId`, `tenantId`, and `role`.
- Missing, malformed, invalid, and incomplete tokens return `401 UNAUTHORIZED`.

### Automated proof

```text
✔ protected routes reject requests without credentials
✔ protected routes reject malformed and invalid bearer tokens
✔ protected routes accept a valid owner token and expose tenant context
✔ protected routes reject tokens missing tenant claims
```

## Phase 4.2 - Tenant context and isolation proof

- `requireTenantContext` rejects requests without validated owner tenant claims with `401 UNAUTHORIZED`.
- Authenticated tenant context is exposed as `req.tenant` with the owner user ID and tenant ID.
- Widget owner lookups require both widget ID and tenant ID.
- Submission list queries always include `tenant_id`; optional widget filters do not remove tenant scoping.
- Cross-tenant widget lookups return no record in the isolation test.

### Automated proof

```text
✔ tenant context is derived from authenticated owner claims
✔ tenant context rejects requests without authenticated tenant claims
✔ widget repository scopes lookup by widget ID and tenant ID
✔ submission repository scopes list queries by tenant ID
```

## Phase 4.3 - Widget management create/read proof

- `POST /api/widgets` requires JWT authentication and tenant context.
- Widget metadata and fields are validated before persistence.
- Widget creation inserts the widget and its fields in one transaction.
- `GET /api/widgets` returns only the authenticated tenant's widgets.
- `GET /api/widgets/:id` reads through tenant-scoped repository access.
- Create responses include a versioned embed snippet.

### Automated proof

```text
✔ widget create returns 201 and an embed snippet
✔ widget list and read routes use the authenticated tenant
✔ widget management routes reject unauthenticated requests
✔ widget creation rejects invalid field definitions
```

The complete suite now passes with 25 tests and 0 failures.

## Phase 4.5 - Embed snippet generation proof

- `createEmbedSnippet` returns a complete script tag using the configured public base URL.
- Widget IDs and versions are URL-encoded into the script URL.
- Widget create, list, and read responses expose the generated `embedSnippet`.

### Automated proof

```text
✔ widget create returns 201 and an embed snippet
✔ widget list and read routes include the authenticated widget snippet
✔ embed snippet generation includes the configured base URL and version
```

## Phase 4.6 - Public configuration CORS proof

- `GET /api/public/widgets/:id/config` now applies CORS for browser widget loaders.
- A request from `http://localhost:5500` returns
  `Access-Control-Allow-Origin: http://localhost:5500`.
- The config response remains cacheable with `Cache-Control: public, max-age=60`.

The complete suite passes with 25 tests and 0 failures.

## Phase 4.7 - Submission idempotency proof

- Public submissions accept the `Idempotency-Key` header.
- The request hash includes the widget ID and payload, preventing a key from being reused for a different request.
- Keys are scoped using the resolved tenant and widget.
- Completed identical requests replay the original submission response without a second insert.
- Conflicting or in-progress key reuse returns a structured `409` error.

### Automated proof

```text
✔ POST /api/public/submissions replays an identical idempotent request
```

The complete suite passes with 26 tests and 0 failures.

## Phase 4.8 - Background job wiring proof

- `src/jobs/index.js` now registers named handlers and dispatches them asynchronously.
- The submission side-effect service registers and enqueues the `submission-side-effects` job.
- The public submission response is returned before the email job finishes.
- Existing retry and `submission_events` failure recording remain inside the job processor.

### Automated proof

```text
✔ registered jobs execute asynchronously after enqueue
✔ POST /api/public/submissions does not fail when async email side effect fails
```

The complete suite passes with 36 tests and 0 failures.

## User registration proof

- `POST /api/auth/register` validates tenant name, tenant slug, email, and password.
- The tenant and first owner are created transactionally.
- Passwords are hashed with bcrypt and never returned in API responses.
- A one-hour HS256 JWT includes the new user ID, tenant ID, and owner role.
- Duplicate tenant slugs or accounts return `409 REGISTRATION_CONFLICT`.

## HTML interface proof

- `admin.html` provides registration, JWT session storage, widget creation, widget links, and dashboard views.
- `public.html` loads public widget configuration and submits visitor data without an owner token.
- `npm run serve:widget-test` serves the pages from a second origin on port 5500.
- Registration CORS allows the admin origin to complete JSON POST preflight and registration.
- Admin network failures now explain that the API must be running on port 3000.
- Protected widget and dashboard browser preflight requests allow the Authorization header before authentication.
- Interface buttons now have clear hover, pressed, focus, and disabled states.
- Admin and public form interfaces are documented and served on separate origins (ports 5500 and 5501).

## Public origin startup proof

- Added `npm run serve:public`, which starts the static server on port 5501 without PowerShell environment-variable syntax.
- Verified `GET http://localhost:5501/public.html?widget=test-widget` returned `200`.
- Verified the response contained the public form markup.

The complete suite passes with 38 tests and 0 failures.

## Phase 4.11 - Documentation and acceptance evidence proof

- `README.md` documents installation, migration, JWT configuration, protected-route usage, widget testing, dashboard queries, limitations, and acceptance commands.
- `capstone.yaml` includes probes for health, widget delivery, public submissions, widget CRUD, dashboard submissions, and all dashboard analytics endpoints.
- Authentication evidence covers missing, malformed, invalid, and incomplete bearer tokens returning `401 UNAUTHORIZED`.
- Tenant-isolation evidence covers tenant-scoped widget and submission repository queries and authenticated dashboard context.
- Idempotency evidence covers identical request replay and conflicting payload protection.
- Dashboard visibility evidence covers authenticated paginated submission retrieval and overview/widget/geo analytics responses.
- AI assistance was provided through Copilot SDK in VS Code; usage cost is not metered by this repository or local test tooling.

### Acceptance command evidence

```text
Command: npm test
Result: 33 tests passed, 0 failed
```

## Phase 4.9 - Dashboard submissions API proof

- `GET /api/dashboard/submissions` requires owner authentication.
- Every dashboard query receives the authenticated tenant ID.
- Supported filters are `widgetId`, `from`, `to`, `page`, and `pageSize`.
- Responses use stable `{ items, pagination }` data with total and total-pages values.
- Invalid filters return `400 INVALID_QUERY`.

### Automated proof

```text
✔ dashboard submissions returns tenant-scoped paginated results
✔ dashboard submissions rejects unauthenticated requests
✔ dashboard submissions rejects invalid pagination and dates
```

## Phase 4.10 - Dashboard analytics APIs proof

- Added `GET /api/dashboard/stats/overview` with total and daily submission counts.
- Added `GET /api/dashboard/stats/widgets` with per-widget totals.
- Added `GET /api/dashboard/stats/geo` with country, region, and city totals.
- All analytics queries require authentication and filter by the authenticated tenant.
- Analytics support optional widget and date-range filters and cap grouped results at 100 rows.

### Automated proof

```text
✔ dashboard analytics returns tenant-scoped overview, widget, and geo data
✔ dashboard analytics requires authentication
✔ dashboard analytics rejects invalid filters
```

The complete suite passes with 33 tests and 0 failures.

## Interface cleanup proof

- Removed the obsolete `widget-test.html` page.
- The admin interface is now served with `npm run serve:admin` on port 5500.
- The public interface remains served with `npm run serve:public` on port 5501.
- Widget creation, public-link generation, configuration loading, and visitor
  submissions are tested through `admin.html` and `public.html`.

## Phase 4.4 - Widget management update/delete proof

- `PATCH /api/widgets/:id` updates only the authenticated tenant's widget.
- Delivery-affecting updates increment `version`.
- Field replacements and widget updates execute transactionally.
- `DELETE /api/widgets/:id` deletes only when both widget ID and tenant ID match.
- Successful deletion returns `204 No Content`; missing or cross-tenant resources return `404 WIDGET_NOT_FOUND`.