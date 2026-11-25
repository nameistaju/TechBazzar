# Bugs Discovered During Refactor

Per the pure-refactor rule, bugs spotted while moving or splitting files are logged here rather than fixed inside structural refactor commits.

| ID | Discovered In | Summary | Status |
| --- | --- | --- | --- |
| RB-01 | Stage 6 (`apps/api/db/index.js:23`) | Running `npm run migrate` on a fresh clone with no `techbazaar.db` fails with `SqliteError: no such column: sku` because `db/index.js` executes `schema.sql` (including indexes on `sku`) before `migrate.js` adds the `sku` column. | Open |
