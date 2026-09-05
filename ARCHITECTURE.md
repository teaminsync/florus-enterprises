# Architecture — Florus Enterprises

This document describes how the system is put together: the data model,
the authorization model, the pricing model, the order lifecycle, and the
design system. It reflects the system as it actually is after Checkpoints
1–8, not the original plan where the two diverge.

## Tech Stack

- **Next.js 16.3**, App Router, Server Components by default, Server
  Actions for all writes.
- **Supabase**: Postgres (all app data), Auth (`@supabase/ssr` for
  session-aware Server/Client Components and middleware-based token
  refresh), Storage (one private bucket, `po-uploads`, for purchase-order
  files).
- **Tailwind CSS** for styling; no component library — hand-built,
  restrained UI per the design direction below.

## Directory Structure (relevant parts)

```
src/
  app/                    routes (App Router)
    admin/                admin-only pages (applications, orders)
    trade/                trade auth flows (register, login, dashboard, set-password)
    products/[slug]/      public product detail
    medicines/             public catalog
    cart/, checkout/, orders/   trade-only ordering flow
    auth/confirm/          invite-link confirmation route
  components/             shared UI (Header, Footer)
  utils/
    supabase/             client.ts (browser), server.ts (cookie-based server client),
                           middleware.ts (session refresh), admin.ts (secret-key client)
    auth/                 require-role.ts, get-session-user.ts
    orders/                transitions.ts (order status state machine)
    pricing.ts             trade price / GST calculation helpers
scripts/                  seed-admin.ts, reset-test-data.ts (see README)
supabase/migrations/      every schema change, in order, as plain SQL
```

## Data Model

All tables live in the `public` schema unless noted. UUID primary keys
throughout.

### `categories`
`id, name, slug, product_type ('medicine' | 'device'), display_order,
created_at`

Seeded once with 17 real therapeutic categories derived from Florus's
actual price lists (Pain Management, Antibiotics, CNS, Neurology, Gastro,
Respiratory, Antihistamine, General Health, Nutraceutical & Multivitamin,
Dietary, Gynecology, Cardiology, Anti-Diabetic, Anti-Cold, Urology,
Dermatology, Oral Care). `product_type` exists so a future "Devices"
top-level category can coexist without a schema change.

### `products`
`id, sap_code (unique, nullable), hsn_code (nullable), name, slug (unique),
composition, category_id → categories, dosage_form, manufacturer,
brand_line, pack_size, case_size, mrp (nullable), sp (nullable),
gst_percent (default 5.00), description, images (jsonb), attributes
(jsonb), is_active, is_upcoming, created_at, updated_at`

228 real products, transcribed verbatim from Florus's six source price
lists. `sap_code` is nullable for two reasons: (1) not-yet-launched
products have no SAP code yet, and (2) one genuine source-data conflict
(see README's "Known Open Items"). `sp` is nullable for the same
not-yet-launched case — `is_upcoming = true` products display on the
public catalog with MRP but cannot be added to a trade cart.

`dosage_form` and `category_id` are deliberately separate axes — category
is therapeutic area (Antibiotics, Pain Management, etc.), dosage_form is
physical form (tablet, injection, syrup, gel, cream, ...). This matters
because some source sheets label products by dosage form ("Injection") in
a way that would otherwise collide with therapeutic categorization.

Product data is managed entirely via SQL migrations — there is no
catalog-management admin UI, by design (see README/PROGRESS Checkpoint 2).

### `profiles`
`id (= auth.users.id), role ('trade' | 'admin'), account_type ('doctor' |
'pharmacy' | 'retailer' | 'hospital', nullable for admins), full_name,
phone, is_active, created_at`

Extends Supabase's `auth.users` (which holds email/password — never
duplicated here). This is the single source of truth for "what can this
logged-in user do," read server-side via `requireRole()`.

### `trade_applications`
`id, applicant_type, full_name, business_or_clinic_name, registration_number,
licence_number, address, city, state, pincode, phone, email, status
('pending' | 'approved' | 'rejected'), admin_notes, reviewed_by →
profiles, reviewed_at, linked_profile_id → profiles, created_at`

A pending application is not itself an account — approval is a distinct,
admin-only action that provisions a real `auth.users` row and a matching
`profiles` row (see "Trade Registration & Approval" below).

### `cart_items`
`id, user_id → profiles, product_id → products, quantity, created_at,
updated_at`, unique on `(user_id, product_id)`. Server-side only —
deliberately not stored in browser `localStorage`, because a prior version
of this project (on a different stack) hit real bugs from stale
localStorage state bleeding between different logged-in users sharing a
browser tab.

### `orders`
`id, user_id → profiles, status (see state machine below), po_storage_path,
po_original_filename, admin_feedback, subtotal_ex_gst, gst_amount,
total_incl_gst, created_at, updated_at`

### `order_items`
`id, order_id → orders, product_id → products, quantity,
unit_price_ex_gst_snapshot`

**No `gst_percent` column** — an earlier draft of the checkout code assumed
one existed and the resulting insert failed the first time a real order
was placed (see `TROUBLESHOOTING.md`). `unit_price_ex_gst_snapshot` alone
is what makes an order's historical pricing immutable: it's computed and
stored once, at submission time, and never recalculated from the live
`products.sp` afterward — confirmed by direct test (change a product's
`sp`, reload an existing order, price is unchanged).

### `order_status_history`
`id, order_id → orders, status, note, changed_by → profiles, changed_at`

One row per transition, including the initial submission. `changed_by` is
always a real `profiles.id`, whether the change was made by an admin
action or a trade user's resubmission — never left null or attributed to
"system."

### Storage: `po-uploads` bucket (private)
Purchase-order files, path-namespaced as `{user_id}/{timestamp}-{filename}`.
RLS on `storage.objects` restricts a trade user to their own files via
`owner_id = auth.uid()::text`; admin access goes through the secret-key
client, which bypasses RLS entirely (see below) — no separate admin
storage policy exists or is needed.

## Authorization Model

Three layers, all server-enforced, never trusting anything the client
sends:

1. **Session** — `@supabase/ssr` provides a browser client, a cookie-aware
   server client, and `src/middleware.ts` (via `utils/supabase/middleware.ts`)
   which calls `supabase.auth.getUser()` on every request to keep the
   session token fresh. Skipping that call was a real early bug — the
   middleware plumbing existed but did nothing without it.
2. **Role** — `requireRole('admin' | 'trade')` (in
   `src/utils/auth/require-role.ts`) reads the server-verified session,
   looks up `profiles.role` for that user, and redirects if it doesn't
   match. Every admin and trade page starts with this call. The role is
   never read from a request parameter, form field, or anything else the
   client controls.
3. **Row-level enforcement** — two complementary mechanisms, used
   deliberately for different purposes:
   - **RLS + explicit table-level `GRANT`** for reads a user should
     legitimately do themselves (browsing the public catalog, viewing
     their own cart/orders). Both a policy *and* a grant are required —
     Postgres checks the grant before it ever evaluates a policy, and
     tables created via CLI migrations do **not** get Supabase Studio's
     automatic default grants. This exact gap caused real, repeated
     `permission denied` failures during development (Checkpoints 3 and
     4 both hit it independently) before it was understood — see
     `TROUBLESHOOTING.md`. Whenever a new table needs a new access
     pattern, both halves must be added and both verified independently
     (`pg_policies` for the policy, `information_schema.role_table_grants`
     for the grant) — checking only one is not sufficient evidence.
   - **The admin/secret-key client** (`createAdminClient()` in
     `src/utils/supabase/admin.ts`) for every trusted server-side write
     that needs to touch data beyond what the acting user should directly
     control — approving applications, transitioning order status,
     importing the catalog. This client uses `SUPABASE_SECRET_KEY` and
     bypasses RLS entirely. It is never exposed to the browser, and every
     Server Action that uses it performs its own `requireRole()` and
     ownership/status checks *before* using it — the admin client's power
     is not itself the authorization check, it's what runs *after* one
     has already passed.

## Pricing Model

Two customer-facing price points:

- **Public / MRP** — shown as-is from `products.mrp`, GST-inclusive per
  the source price lists' own terms, no markup or discount applied. This
  is what anonymous visitors and the "reference" view see.
- **Trade price** — shown only to authenticated `role = 'trade'` users:
  `trade_price_ex_gst = products.sp × 1.10` (a flat 10% margin on the
  stockist price, computed GST-exclusive). GST (`products.gst_percent`,
  currently 5% on every real product, but read from the column, never
  hardcoded) is shown as a **separate line only at cart/checkout**, never
  folded into the displayed per-unit trade price. This was a deliberate,
  explicit decision (not a default) — confirmed with the project owner
  before implementation.

At checkout, prices are **always recomputed server-side** from the current
`products.sp` and `products.gst_percent` at the moment of submission —
never trusted from the cart's earlier state, never trusted from anything
the client sends. The resulting per-line price is written once to
`order_items.unit_price_ex_gst_snapshot` and never touched again.

A real worked example, verified against actual seeded data: `CLAVIN-625`,
`sp = 74.00` → trade price ex-GST `81.40` → total incl. 5% GST `85.47`.

## Trade Registration & Approval Workflow

1. Anyone can submit `/trade/register` (no login required to apply). This
   creates a `trade_applications` row with `status = 'pending'` — it does
   **not** create any login-capable account.
2. An admin reviews the application at `/admin/applications/[id]` and
   either rejects it or approves it.
3. On approval, the server action:
   - Calls `adminClient.auth.admin.generateLink({ type: 'invite', email })`
     — deliberately **not** `inviteUserByEmail()`. Supabase's default
     invite email uses implicit-flow tokens (in the URL hash fragment),
     which never reach the server and are incompatible with
     `@supabase/ssr`'s PKCE-flow browser client. `generateLink` returns a
     `hashed_token` directly to server code instead of sending an email,
     which sidesteps the incompatibility entirely.
   - Builds a confirmation URL from that token:
     `{SITE_URL}/auth/confirm?token_hash=...&type=invite&next=/trade/set-password`.
   - Creates the matching `profiles` row (`role = 'trade'`, `account_type`
     from the application).
   - Updates the application to `approved`, links it to the new profile.
   - **Returns the invite URL directly in the admin UI** (not via a
     redirect with the token in the URL bar — via the Server Action's
     return value, kept out of browser history/server logs) for the admin
     to copy and relay to the applicant manually.
4. `/auth/confirm` (a route handler, not a page) receives the token,
   calls `supabase.auth.verifyOtp({ type, token_hash })` using the
   cookie-based server client, which establishes a real session via
   cookies — no hash-fragment parsing involved.
5. The now-authenticated user lands on `/trade/set-password`, sets a real
   password, and is redirected to `/trade/dashboard`.

## Order Lifecycle

```
pending_verification → approved | rejected | needs_revision   (admin only)
needs_revision        → pending_verification                   (trade user resubmission only)
approved              → fulfilled                               (admin only)
rejected              → (terminal)
fulfilled             → (terminal)
```

Every transition — admin action or trade resubmission — follows the same
pattern: re-fetch the order's **current** status from the database
immediately before acting (never trust a status value the page happened
to render earlier in the request), validate the transition is legal via
`canAdminTransition()` / `canTradeUserResubmit()` (`src/utils/orders/
transitions.ts`), then write the new status and insert a new
`order_status_history` row. This "double-fetch" pattern exists specifically
to prevent a stale or double-submitted form from illegally transitioning
an order that's already moved on (e.g. approving an order in one browser
tab after it was already rejected in another).

Resubmission (trade user, `needs_revision → pending_verification`) checks
two things independently before proceeding: that the order actually
belongs to the calling user, and that its status is exactly
`needs_revision` — both verified server-side against the database, not
against anything rendered on the page.

PO files are previewed and downloaded via two separately-generated signed
URLs from the same private storage path — one plain (for inline preview,
`<iframe>` for PDFs / `<img>` for images) and one with Supabase's
`download` option set (forces a browser download rather than inline
navigation).

## Design System (Checkpoint 8)

- **Type scale**: page h1 `text-4xl font-bold` (home hero only, larger:
  `text-5xl md:text-6xl`); section h2 `text-2xl font-semibold`; card/item
  h3 `text-lg font-semibold`; body `text-base`; secondary `text-sm
  text-gray-600`; caption `text-xs text-gray-500`.
- **Spacing**: page container `py-12` (marketing pages `py-16`); vertical
  rhythm `space-y-6` / `gap-6`; card padding `p-6`; standard container
  width `max-w-4xl`, dashboard/admin `max-w-6xl`.
- **Color**: brand blue `#009EE0` for interactive elements only (buttons,
  links, active/hover/focus states) — never as a large background fill.
- **Cards**: `border border-gray-200 rounded-lg p-6`, `hover:border-
  [#009EE0] hover:shadow-md`, no default shadow.
- **Responsive**: mobile-first; `sm:` for early 2-column, `md:`/`lg:` for
  wider grids and multi-column layouts.

Admin pages intentionally stay denser/table-heavy than the public site
(internal tool, not brand-facing) but follow the same type scale and
spacing rhythm at minimum.
