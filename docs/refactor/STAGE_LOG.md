# Refactor Stage Verification Log

## Stage 0 — Safety Net (`3e3a353`)
- `npm run verify`: ESLint `0` errors (`48` unused-var warnings); Vitest `7` files, `63/63` passed (`3.86s`); Vite build (`7.71s`).
- `npx playwright test --reporter=list`: `4 passed (9.3s)`.
- Route dump: `128` routes (`docs/refactor/baseline-routes.json`).
- Schema dump: `33` tables, `16` indexes (`docs/refactor/baseline-schema.json`).
- Visual baseline: `26` PNGs captured across 13 views at `375px` and `1440px` (`docs/refactor/baseline-screenshots/`).

## Stage 1 — Monorepo Skeleton (`54ff860`)
- `npm run verify`: ESLint `0` errors (`48` warnings); Vitest `7` files, `63/63` passed (`2.72s`); `npm run test:web` `4/4`; `npm run test:api` `59/59`; Vite build (`6.71s`).
- Route dump vs baseline: `routesIdentical: true` (`128` routes).
- Schema dump vs baseline: `schemaIdentical: true` (`33` tables, `16` indexes).
- Chunk sizes vs baseline: `index-1dQBd0hF.css` `65,898 B` (exact); `AdminPage` `313,153 B` (vs `677,718 B`), `vendor-react` `163,709 B` (vs `346,228 B`), `index` `159,602 B` (vs `320,316 B`), `vendor-state` `83,071 B` (vs `96,450 B`) — all <= baseline (`+0%` / negative delta).
- Playwright E2E (`npm run test:e2e`): `4 passed (10.6s)` against `:5000`.
- `npm run dev` smoke check: `:5000/api/health` -> `200`, `:3000/api/products?limit=1` -> `200`, `:3000/` & `/images/image-149.png` -> `200`.

## Stage 2 — Stray Cleanup & Backend Structure (`313f071`, `344165c`, `308c3ac`, `admin-split`)
- Stray cleanup (`313f071`): Logged in `docs/refactor/DELETIONS.md` (`416` SHA-256 duplicate `images/` `git rm`ed, `24` legacy `.gif`s + differing `image-149.png`/`image-29.webp` archived to `../WholeMarket_eccom_archive/legacy-images/`, `7` PNGs archived to `../WholeMarket_eccom_archive/misc/`, `dist/`, `__pycache__/`, `test-results/`, `server/db/database.sqlite` removed, `scratch/` untouched).
- `npm run verify`: ESLint `0` errors (`48` warnings); Vitest `7` files, `63/63` passed (`5.99s`); Vite build (`18.01s`).
- Route dump vs baseline: `routesIdentical: true` (`128` routes in exact order).
- Schema dump vs baseline: `schemaIdentical: true` (`33` tables, `16` indexes).
- Chunk sizes vs Stage 1: identical (`AdminPage` `313,153 B`, `index-1dQBd0hF.css` `65,898 B`).
- Playwright E2E (`npm run test:e2e`): `4 passed (12.5s)` against `:5000`.
- `npm run dev` smoke check: `:5000/api/health` -> `200`, `:3000/api/products?limit=1` -> `200`, `:3000/` & `/images/image-149.png` -> `200`.
