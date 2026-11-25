# TechBazaar (Retail + Wholesale Electronics Store)

Full-stack dual-channel electronics e-commerce storefront and single-admin back-office built with React 18, Vite 6, Tailwind CSS 3.4, Express 5, and SQLite (`better-sqlite3`).

## Quick Start

```bash
npm install
cp .env.example .env   # Configure JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm run seed           # Seed catalog & admin/customer accounts
npm run dev            # Starts Express API (:5000) + Vite client (:3000)
```

## Scripts

- `npm run dev`: Run backend (`node --watch server/index.js`) and frontend (`vite`) concurrently.
- `npm run client`: Run Vite dev server on port `3000`.
- `npm run server`: Run Express API server on port `5000`.
- `npm run build`: Build production frontend bundle to `dist/`.
- `npm run preview`: Preview production build locally.
- `npm run seed`: Seed products, users, and default addresses.
- `npm run images`: Convert GIFs to static WebP posters and generate responsive `-200/-480/-1000.webp` variants (ignored by git).
- `npm run backup`: Create a consistent SQLite snapshot in `server/db/backups/`.
- `npm run verify`: Run lint, unit/integration tests, and production build.

## Architecture & Conventions

- **Money Convention**: All monetary columns in SQLite and all API payloads are stored and transported as **integer paise** (e.g., ₹1,499 = `149900`). Client formatting uses `formatMoney(paise)`.
- **Dual Channels**: Retail (guest-first, localStorage) and Wholesale (approved B2B buyers, MOQ/pack-size/tier/credit enforcement) stay strictly isolated.
- **Database**: SQLite at `server/db/techbazaar.db` (WAL mode, foreign keys enabled). Migrations live in `server/db/migrations/` and are tracked in `schema_migrations`.
