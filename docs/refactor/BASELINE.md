# Stage 0 Baseline Report

Recorded on branch `refactor/structure` at tag `pre-refactor` prior to moving or splitting any source files.

## 1. Gate Baselines
- `npm run verify`: ESLint `0` errors (`48` unused-var warnings); Vitest `7` files, `63/63` passed (`4.29s`); Vite production build (`7.23s`).
- Playwright E2E (`npx playwright test --reporter=list`): `4` passed (`9.3s`).
- Route dump (`scripts/dump-routes.mjs` -> `docs/refactor/baseline-routes.json`): `128` routes.
- Schema dump (`scripts/dump-schema.mjs` -> `docs/refactor/baseline-schema.json`): `33` tables, `16` indexes.

## 2. Production Build Chunk Sizes (`dist/assets`)
Budget rule for refactor stages: every chunk stays within `+5%` of baseline.

| Asset | Baseline Size (bytes) | Max +5% Budget (bytes) |
| --- | ---: | ---: |
| `AdminPage-CyBBJV6K.js` | 677,718 | 711,603 |
| `vendor-react-VWPwWZ13.js` | 346,228 | 363,539 |
| `index-Dy9Ht7yn.js` | 320,316 | 336,331 |
| `vendor-state-DI3aV2U7.js` | 96,450 | 101,272 |
| `index-1dQBd0hF.css` | 65,898 | 69,192 |
| `QuickOrderPage-CL8mUGZj.js` | 61,942 | 65,039 |
| `WholesaleCheckoutPage-DR_VlZba.js` | 59,902 | 62,897 |
| `CheckoutPage-CLG97H8C.js` | 56,407 | 59,227 |
| `ShopPage-CThD2mlV.js` | 54,429 | 57,150 |
| `ProductDetailPage-CFYXy-B_.js` | 49,846 | 52,338 |
| `CartPage-DBZy77WF.js` | 36,634 | 38,465 |
| `AccountPage-CSiho9k3.js` | 34,339 | 36,055 |
| `QuoteRequestPage-qGSRp60u.js` | 31,722 | 33,308 |
| `OrderSuccessPage-C1Nrecg3.js` | 31,706 | 33,291 |
| `TrackOrderPage-Bn6SRQGs.js` | 15,090 | 15,844 |
| `ContactPage-D4X26gvv.js` | 14,867 | 15,610 |
| `WishlistPage-Bhg_yHmX.js` | 6,480 | 6,804 |
| `SearchResultsPage-BzoS0ayh.js` | 6,198 | 6,507 |
| `NotFoundPage-DwYsnaGb.js` | 3,017 | 3,167 |
| `Breadcrumbs-Dzc1ZvZ3.js` | 2,129 | 2,235 |
| `ordersApi-DHDmg56-.js` | 287 | 301 |
| `addressesApi-3cld0C76.js` | 278 | 291 |

## 3. Codebase Size & File Distribution
- Total code files counted across `src/`, `server/`, `tests/`: `128`
- Files over 400 lines: `33`
- Folder counts:
  - `src/components`: `46`, `src/pages`: `16`, `src/api`: `8`, `src/data`: `3`, `src/context`: `2`, `src/layouts`: `2`, `src/store`: `2`, `src/utils`: `2`, `src/hooks`: `1`, `src/styles`: `1`, `src/App.jsx`: `1`, `src/main.jsx`: `1`
  - `server/routes`: `11`, `server/db`: `11`, `server/services`: `5`, `server/middleware`: `4`, `server/index.js`: `1`, `server/utils`: `1`, `server/validators`: `1`
  - `tests/backend`: `7`, `tests/e2e`: `1`, `tests/frontend`: `1`

### Top 20 Largest Files (LOC)
1. `src/data/products.js` (8,086)
2. `server/routes/admin.js` (2,939)
3. `src/components/admin/ProductsView.jsx` (2,038)
4. `src/components/admin/BannersView.jsx` (1,152)
5. `src/components/admin/InvoicesView.jsx` (989)
6. `src/pages/CheckoutPage.jsx` (977)
7. `src/components/admin/CustomersView.jsx` (937)
8. `src/pages/WholesaleCheckoutPage.jsx` (898)
9. `src/pages/ProductDetailPage.jsx` (835)
10. `server/services/calculation.js` (809)
11. `src/components/admin/OrdersView.jsx` (793)
12. `src/pages/QuickOrderPage.jsx` (776)
13. `server/routes/wholesale.js` (769)
14. `src/components/admin/BrandingThemeTab.jsx` (746)
15. `server/routes/orders.js` (695)
16. `src/pages/AccountPage.jsx` (645)
17. `src/components/common/Navbar.jsx` (642)
18. `src/context/StoreContext.jsx` (638)
19. `src/components/admin/DiscountsView.jsx` (637)
20. `src/components/common/NavbarSearch.jsx` (620)

## 4. Dependency & Dead-Code Baseline
- `madge --circular src server`: `Processed 48 files (1 warning). No circular dependency found!`
- `knip`:
  - Unused files (9): `scripts/dump-routes.mjs`, `scripts/dump-schema.mjs`, `server/db/execute_merge.js`, `server/db/generateSampleBanners.js`, `server/db/migrate_dedup.js`, `server/db/migrate_dual_cart.js`, `server/db/migrate.js`, `server/db/migrations/001_paise_convention.js`, `server/db/seedAdmin.js`
  - Unused dependency (1): `framer-motion`
  - Unused devDependencies (3): `@testing-library/jest-dom`, `@testing-library/react`, `prettier`
  - Unused exports: `26`; Duplicate exports: `14`
- `depcheck`:
  - Unused dependency: `framer-motion`
  - Unused devDependencies reported: `@testing-library/jest-dom`, `@testing-library/react`, `@types/canvas-confetti`, `@types/react-dom`, `autoprefixer`, `postcss`, `prettier`, `tailwindcss` (note: PostCSS/Tailwind/TypeScript plugin usage is external to static JS import parsing)

## 5. Visual Baseline Screenshots
Saved in `docs/refactor/baseline-screenshots/` via `scripts/capture-visual-baseline.mjs` against an isolated temporary copy of `techbazaar.db` at viewports `375x812` and `1440x900` across 13 views (`26` PNGs):
- `home`, `shop`, `product`, `cart-drawer`, `cart-page`, `quick-order`, `checkout`, `order-success`, `track`, `account`, `admin-dashboard`, `admin-products`, `admin-orders`.
