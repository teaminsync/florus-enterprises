# Progress — Florus Enterprises

Dated log of completed checkpoints. Each entry reflects the final,
corrected state of that checkpoint's work — where something was found and
fixed after the checkpoint's initial pass (schema bugs, data-accuracy
corrections), this log records the outcome, not the intermediate mistake.
See `TROUBLESHOOTING.md` for the full story behind anything non-obvious
referenced here.

---

## Checkpoint 1 — Project Scaffolding
**Completed:** August 27, 2026

Next.js 16.3 (App Router, TypeScript, Tailwind, `src/` directory) created
via `create-next-app`. Supabase client helpers established:
`src/utils/supabase/client.ts` (browser), `server.ts` (cookie-based
server client), `middleware.ts` + root `src/middleware.ts` (session
refresh — includes the `supabase.auth.getUser()` call the middleware
needs to actually do anything; a version without it would compile but
silently do nothing). Supabase CLI installed, project linked to
`elwqbhuaycalotcgxbjh`. `.env.local` populated with the current-format
`sb_publishable_`/`sb_secret_` keys. Connection verified via a real
round-trip query, not just successful client construction.

---

## Checkpoint 2 — Database Schema & Seed Data
**Completed:** August 27, 2026

Full schema created via CLI migrations: `categories`, `products`,
`profiles`, `trade_applications`, `cart_items`, `orders`, `order_items`,
`order_status_history`. RLS enabled on all eight tables from the start.
17 real categories seeded (deduplicated from Florus's actual price
sheets' inconsistent spellings — "Antiboitics"/"Anti-Biotics" → 
"Antibiotics", etc.). 23 real sample products seeded across all 17
categories, transcribed verbatim from the source price lists, including
two intentionally unpriced ("upcoming") products to prove the schema
tolerates `sp = null`.

Public read policies added for `categories` (fully public) and `products`
(active rows only) — this checkpoint's RLS policies were written correctly
but, unknown at the time, were incomplete without a matching `GRANT` (see
Checkpoint 3 and `TROUBLESHOOTING.md` #1).

---

## Checkpoint 3 — Public Site Shell & Catalog
**Completed:** August 27, 2026

Public pages built: `/`, `/about`, `/contact`, `/medicines` (search +
category filter), `/products/[slug]`. Category navigation pulled live
from the database, not hardcoded. MRP-only pricing throughout.

**Bug found and fixed mid-checkpoint**: both `/medicines` and the home
page's category grid rendered empty — `categories`/`products` reads were
failing with `permission denied for table X` despite correct RLS policies,
because tables created via CLI migrations never received Supabase
Studio's automatic default `GRANT`. Fixed with an explicit `grant select`
migration; verified independently via `information_schema.role_table_grants`
in addition to `pg_policies`, since the earlier RLS-only verification had
looked complete but wasn't. This was the first occurrence of a pattern
that recurred in later checkpoints — see `TROUBLESHOOTING.md` #1.

Category filter and full-text search (matching on both `name` and
`composition`) verified against real seeded data, including a
composition-only match to prove the search wasn't silently checking only
one column.

---

## Checkpoint 4 — Auth, Trade Registration & Admin Approval
**Completed:** August 28, 2026

Real session-based auth via `@supabase/ssr`. `requireRole()` helper
established as the standard pattern for every protected page — derives
role from the server-verified session plus a `profiles` lookup, never
from anything client-supplied. Trade registration form (`/trade/register`)
with applicant-type-specific fields. Admin applications queue
(`/admin/applications`) with approve/reject.

**Design decision, made deliberately mid-checkpoint**: Supabase's default
`inviteUserByEmail()` uses implicit-flow tokens incompatible with this
project's PKCE-flow browser client, and the project has no custom SMTP
configured (required to edit Supabase's locked default email templates).
Rather than stand up email infrastructure mid-checkpoint, switched to
`admin.generateLink()` — the resulting invite link is displayed directly
to the admin in the UI to relay manually, which fits how Florus already
verifies trade applicants (by phone) before approving them. See
`ARCHITECTURE.md` for the full mechanism.

Idempotent admin-seed script established (`scripts/seed-admin.ts`) after
an earlier version was found to silently do nothing on a second run if
the first run had partially failed — fixed to correctly detect and handle
"auth user exists but profile doesn't" as a real, recoverable state.

Two real data bugs found via direct database inspection after initial
browser testing (not caught by any automated check): approved trade
profiles had `account_type` left `null`, and `trade_applications.
linked_profile_id` was never set despite being part of the original spec.
Both fixed at the source and confirmed via the same real approved
accounts, backfilled where the bug had already produced live rows.

Full end-to-end flow — real registration, real admin approval, real
invite-link click-through, real password set, real login — verified in
an actual browser, not simulated.

---

## Checkpoint 5 — Trade Pricing, Cart & Checkout
**Completed:** August 28, 2026

Trade pricing formula implemented: `trade_price_ex_gst = products.sp ×
1.10`, GST (`products.gst_percent`, per-product, not hardcoded) shown as
a separate line only at cart/checkout — confirmed as the intended display
convention before implementation, not assumed. Server-side cart
(`cart_items`), checkout with required PO upload to a private Storage
bucket (`po-uploads`), real order creation with immutable per-line price
snapshots (`order_items.unit_price_ex_gst_snapshot`).

**Two real bugs found before any real order had ever been placed**, both
from the same underlying cause — code that had never actually been
executed against the real schema:
- The checkout insert included a `gst_percent` field on `order_items`
  that the table doesn't have; would have failed the first real checkout
  outright. Fixed by removing it.
- The order's total GST was computed as a hardcoded 5% of the subtotal
  rather than summed from each line's real per-product rate — invisible
  under normal testing because every seeded product happens to be 5%.
  Fixed to accumulate real per-line GST; verified by deliberately testing
  with a temporary 18%-GST product alongside a real 5% product in the
  same order and confirming the stored total matched the true sum.

Full lifecycle — add to cart, edit quantities, checkout with a real PO
file, and (the most important property of this checkpoint) **price
snapshot immutability** — verified in a real browser: an existing order's
stored unit price was confirmed unchanged after deliberately updating the
underlying product's `sp` and reloading the order.

---

## Checkpoint 6 — Admin Order Review & Resubmission Loop
**Completed:** August 29, 2026

Full order lifecycle implemented: `/admin/orders` (list, filterable by
status, with counts) and `/admin/orders/[id]` (detail, PO preview via
dual signed URLs — one inline, one forced-download — and status-transition
actions). Legal transitions enforced via `canAdminTransition()` /
`canTradeUserResubmit()` (`src/utils/orders/transitions.ts`), with every
action re-fetching the order's real current status immediately before
acting, to prevent a stale or double-submitted form from illegally
transitioning an order that's already moved on.

**Bug found before any real order review had happened**: both new admin
pages selected `email` from a `profiles` join; `profiles` has no `email`
column (it lives on `auth.users` only). Fixed by fetching it separately
via the Auth Admin API.

Full lifecycle exercised for real: one order approved, one rejected (with
feedback), one sent to `needs_revision` and then genuinely resubmitted by
the trade user with a new PO (confirming `admin_feedback` clears and
status returns to `pending_verification`), one approved then marked
fulfilled. Illegal-transition guard confirmed by actually attempting to
approve an already-rejected order and observing the real rejection.
Resubmission's two independent guards (ownership, correct status)
confirmed by attempting each failure case directly, not just described.
Full sequence also manually re-verified in a live browser session by
creating three real orders through the actual trade/admin UI.

---

## Checkpoint 7 — Full Catalog Import
**Completed:** September 2, 2026

All 228 real products imported from Florus's six source price lists, up
from the 23-item Checkpoint 2 sample. Real, verified breakdown by brand
line (queried directly, not computed by hand): Axera Nexxon 60, Sorvus
Franchisee 73, Axera Trion 19 (11 launched + 8 upcoming, including one
intentionally-`NULL`-SAP-code row — see below), Axera Critical Care 8,
Axera Spectrum 68. The separate GRPPL Critical Care Franchisee sheet
contributed zero new rows — every one of its SAP codes duplicates a row
already present on the GRPPL Franchisee sheet, confirmed before import.

Migration used `ON CONFLICT (sap_code) DO NOTHING`, so the original 23
sample products were preserved rather than duplicated.

**Known, flagged, unresolved data issue**: the source Axera Trion sheet
lists two genuinely different products under the same SAP code
(5602597). Rather than fabricate a distinct code, the second product
("TELMICLAR TAB 40MG,15'S") was imported with `sap_code = NULL`. Florus
needs to supply the real code.

A minor post-import metadata inconsistency (two products sharing a
duplicate-sheet origin were labeled with different `brand_line` values
depending on which checkpoint's data entry pass touched them first) was
found and corrected for consistency; not a functional issue, purely
cosmetic.

---

## Checkpoint 8 — Design Consistency & Polish Pass
**Completed:** September 4, 2026

Site-wide visual consistency pass across every page, with no functional,
schema, or business-logic changes. Established and applied a single
reference for type scale, spacing rhythm, color usage, and card styling
(documented in full in `ARCHITECTURE.md`'s "Design System" section) across
pages that had been built independently across seven prior sessions and
had predictably drifted (inconsistent heading sizes, spacing values, and
button treatments between e.g. Checkpoint 3's public pages and
Checkpoint 5/6's cart/checkout/admin pages).

Header made session-aware: anonymous visitors see the trade-registration
CTA; logged-in trade users see Cart/Orders links and an account menu;
logged-in admins see an Admin link and dashboard shortcut, rather than
every visitor seeing the same "Register" prompt regardless of session
state.

Responsive breakpoints audited and corrected on the site's more complex
layouts (catalog grid, cart/checkout two-column layouts, admin order
detail with PO preview + sidebar) to confirm real `sm:`/`md:`/`lg:`
degradation rather than a fixed desktop-only layout.

`npm run build` confirmed clean throughout. Final visual judgment (does
it actually *look* premium and consistent, not just pass a lint/build
check) was done by the project owner directly in a browser, not asserted
by the coding agent — this checkpoint's evidence bar is necessarily
different from the data-driven checkpoints before it.
