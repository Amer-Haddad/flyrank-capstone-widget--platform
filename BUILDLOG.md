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