# ADR: Dual Cart Architecture & Wholesale Buyer System

## Status
Accepted

## Date
2026-11-23

## Context & Problem Statement
TechBazaar currently mixes retail and wholesale parameters within a single cart and checkout flow. To serve both everyday consumers (retail guests) and verified B2B buyers (resellers, retailers, corporate accounts), the platform requires two strictly isolated purchasing channels:
1. **Retail Mode**: Guest-first, zero login friction, single-unit pricing, consumer coupons, standard B2C invoices.
2. **Wholesale Mode**: Authenticated & admin-approved B2B accounts, group-based discounts, tier quantity brackets, MOQ & pack rules, credit terms (Net 15/30), 50% advance booking, and GST B2B tax invoicing.

Items, totals, pricing calculations, storage mechanisms, and order pipelines must never contaminate each other across modes.

## Decision Outcome
1. **Mode Isolation**:
   - `mode` state ('retail' | 'wholesale') persisted in localStorage.
   - Retail cart stored in `localStorage['techbazaar_retail_cart']` (guest-first, zero login required).
   - Wholesale cart synchronized with SQLite `wholesale_cart_items` table linked to authenticated, approved wholesale buyer accounts (`users.wholesale_status = 'approved'`).
   - Switching modes switches active context while preserving both carts intact.
2. **Pricing & Discount Stacking Architecture**:
   - Integer paise precision on server.
   - Strict stacking sequence: Base Tier Unit Price -> Group Extra Discount % -> Audience-Filtered Promo Discounts -> Tax Computation (CGST/SGST vs IGST) -> Round-Off.
   - Server-authoritative: client-side prices are for display; `/api/wholesale/cart/validate` and order endpoints recompute all values against database products and rules.
3. **Buyer Lifecycle & Group Governance**:
   - Registration/Application via `/api/wholesale/apply` (status: `pending`).
   - Admin approval assigns a `wholesale_groups` tier (e.g., Bronze, Silver, Gold, Platinum).
   - Teaser pricing displayed to guests/pending applicants without exposing privileged server discounts.
4. **Channel-Aware Orders & Invoices**:
   - Orders tagged with `channel: 'retail' | 'wholesale'`.
   - Invoices generated as `type: 'retail'` (simplified B2C) or `type: 'gst'` (full B2B with GSTIN, HSN, Place of Supply, and credit ledger entry).

## Consequences
- **Positive**: Strict data integrity, no cross-contamination between retail and bulk carts, resilient offline/online synchronization, complete compliance with Indian GST B2B regulations.
- **Negative / Operational**: Requires maintaining two checkout flows and dual invoice format templates. Server-side validation guards prevent any client price spoofing.
