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