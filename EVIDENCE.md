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

### Validation command

```bash
cd C:\Users\USER\Desktop\flyrank-capstone-widget--platform
node --test test/public-submissions.test.js
```

### Proof output

```text
POST /api/public/submissions 201 18.757 ms - 347
✔ POST /api/public/submissions creates a submission for valid payloads
POST /api/public/submissions 400 1.962 ms - 195
✔ POST /api/public/submissions rejects invalid payloads with 400
POST /api/public/submissions 400 1.405 ms - 214
✔ POST /api/public/submissions blocks spam honeypots
POST /api/public/submissions 429 0.372 ms - 115
✔ POST /api/public/submissions rate-limits repeated requests
ℹ tests 4
ℹ pass 4
ℹ fail 0
```

### Evidence of the implementation

- Public route config in [src/routes/public.routes.js](C:/Users/USER/Desktop/flyrank-capstone-widget--platform/src/routes/public.routes.js)
- Validator rules in [src/validators/public-submissions.validator.js](C:/Users/USER/Desktop/flyrank-capstone-widget--platform/src/validators/public-submissions.validator.js)
- Submission service checks in [src/services/public-submissions.service.js](C:/Users/USER/Desktop/flyrank-capstone-widget--platform/src/services/public-submissions.service.js)
- Regression tests in [test/public-submissions.test.js](C:/Users/USER/Desktop/flyrank-capstone-widget--platform/test/public-submissions.test.js)

This confirms the Phase 2.1 gate is satisfied for cross-origin public submission ingestion under valid, invalid, spam, and rate-limited conditions.