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

### Evidence of the implementation

- Public route config in [src/routes/public.routes.js](C:/Users/USER/Desktop/flyrank-capstone-widget--platform/src/routes/public.routes.js)
- Validator rules in [src/validators/public-submissions.validator.js](C:/Users/USER/Desktop/flyrank-capstone-widget--platform/src/validators/public-submissions.validator.js)
- Submission service checks in [src/services/public-submissions.service.js](C:/Users/USER/Desktop/flyrank-capstone-widget--platform/src/services/public-submissions.service.js)
- Geo enrichment service in [src/services/geo-enrichment.service.js](C:/Users/USER/Desktop/flyrank-capstone-widget--platform/src/services/geo-enrichment.service.js)
- Email side-effect job in [src/services/submission-side-effects.service.js](C:/Users/USER/Desktop/flyrank-capstone-widget--platform/src/services/submission-side-effects.service.js)
- Database persistence hook in [src/repositories/public-submissions.repository.js](C:/Users/USER/Desktop/flyrank-capstone-widget--platform/src/repositories/public-submissions.repository.js)
- Regression tests in [test/public-submissions.test.js](C:/Users/USER/Desktop/flyrank-capstone-widget--platform/test/public-submissions.test.js)

This confirms the Phase 2.2, 2.3, 2.4, and 2.5 gates are satisfied for abuse protection, geolocation fallback, non-blocking side effects, and resilient submission storage under valid, invalid, spam, rate-limited, provider-failure, and async email-failure conditions.