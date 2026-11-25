# TechBazaar Monorepo Structure

```
WholeMarket_eccom/
├── apps/
│   ├── api/                        # @techbazaar/api (Express 5 + better-sqlite3)
│   │   ├── db/
│   │   │   ├── migrations/         # SQLite schema migrations
│   │   │   └── seeds/              # Catalog & default data seeders
│   │   ├── src/
│   │   │   ├── app.js              # Express app wiring & middleware
│   │   │   ├── server.js           # HTTP server entrypoint (:5000)
│   │   │   ├── core/               # Auth, rate-limit, validation, upload middleware
│   │   │   ├── db/                 # SQLite connection & query helpers
│   │   │   ├── services/           # Calculation engine, PDF generator, etc.
│   │   │   └── modules/            # Domain route modules
│   │   │       ├── admin/          # Split into 13 domain sub-modules + schemas.js
│   │   │       ├── auth/
│   │   │       ├── catalog/
│   │   │       ├── orders/
│   │   │       ├── quotes/
│   │   │       └── wholesale/
│   │   └── tests/                  # Vitest + Supertest API integration tests
│   └── web/                        # @techbazaar/web (React 18 + Vite + Tailwind)
│       ├── public/                 # Static assets (/images/*, /uploads/*) untouched
│       ├── src/
│       │   ├── app/                # App.jsx, layouts/, providers/ (@app)
│       │   ├── shared/             # api/, data/, hooks/, store/, styles/, ui/, utils/ (@shared)
│       │   └── features/           # Domain features (@features)
│       │       ├── account/
│       │       ├── admin/          # AdminPage + domain-split views/modals/drawers
│       │       ├── auth/
│       │       ├── cart/
│       │       ├── catalog/
│       │       ├── checkout/
│       │       ├── home/
│       │       ├── support/
│       │       └── wholesale/
│       ├── tests/                  # Vitest frontend unit tests
│       └── vite.config.js
├── docs/
│   └── refactor/                   # Baseline dumps, DELETIONS.md, STAGE_LOG.md, STRUCTURE.md
├── e2e/                            # Playwright E2E suite
├── packages/                       # Reserved for future shared packages (Stage 4 skipped)
└── scripts/                        # Route/schema dumpers, image optimizer, DB backup
```
