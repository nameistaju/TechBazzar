# ADR 001: TechBazaar Full-Stack Monorepo Architecture & Guest-First Commerce

## Status
Accepted

## Context
TechBazaar is transforming from a mock frontend into a complete, full-stack electronics and gadgets e-commerce platform. The system requires:
1. Strict guest-first UX (browsing, wishlist, add to cart, and complete order placement without authentication prompts).
2. Frictionless post-order account creation that claims past orders.
3. Server-side transactional checkout that recalculates prices, validates stock, and decrements inventory atomically.
4. Un-enumerable guest order tracking via order number and matching email/phone or unguessable tracking tokens.
5. Role-based administration for inventory, orders, and sales metrics.
6. Local persistence with zero cloud or Docker dependencies.

## Decisions

### 1. Monorepo Organization
- **Client**: React 18 + Vite 6 + Tailwind CSS in `src/` (leveraging existing verified design system, components, and zero-downtime routing).
- **Server**: Node.js + Express in `server/`, configured with Vite proxy `/api` -> `http://localhost:5000`.
- **Database**: SQLite via `better-sqlite3` (`server/db/techbazaar.db`).
- **Orchestration**: `concurrently` executes both client and server via a single root command `npm run dev`.

### 2. Security & Authentication
- **Password Hashing**: `bcryptjs` (pure JS, salt rounds = 10, cross-platform on Windows).
- **Session Tokens**: JWT stored in `httpOnly`, `SameSite=Lax` cookies, preventing XSS token extraction.
- **Access Control**: Role-based access control (`customer`, `admin`). Sensitive endpoints (`/api/admin/*`) require verified admin credentials.
- **Order Lookup Protection**: Guest tracking requires order number + matching email or phone number to prevent order ID scraping.

### 3. Inventory & Checkout Invariants
- Checkout calculations happen strictly server-side inside SQLite `db.transaction()`.
- Orders fail gracefully with exact item names if available stock < requested quantity.
- Client optimistic state updates rollback cleanly upon validation errors.

### 4. State Synchronization
- **Guest State**: Client `localStorage` maintains cart, wishlist, and recently viewed items without server dependencies.
- **Login State**: On user login, local cart and wishlist items are sent to `/api/cart/sync` and `/api/wishlist/sync` to merge into the user's permanent database account. Past guest orders with matching email are linked to the account.

## Consequences
- Fast, zero-compile execution on Windows with zero cloud prerequisites.
- High security guarantees with httpOnly cookies and parameterized SQL queries.
- Clean separation of concerns with clear API response contracts `{ data, error }`.
