# Architecture — Florus Enterprises

How the platform is built and why. This document describes the system as it stands, not its history. For the dated build log see [PROGRESS.md](PROGRESS.md); for past bugs and their root causes see [TROUBLESHOOTING.md](TROUBLESHOOTING.md); for setup see [README.md](README.md).

## 1. System overview

```
                        ┌──────────────────────────────┐
  Browser ─────────────►│  Next.js app on Vercel       │
  (public, trade, admin)│  Server Components + Actions │
                        └──┬─────────┬─────────┬───────┘
                           │         │         │
              ┌────────────▼──┐  ┌───▼─────┐  ┌▼────────────────┐
              │ Supabase      │  │ Resend  │  │ Razorpay        │
              │ Postgres      │  │ (email) │  │ Orders, refunds │
              │ Auth          │  └─────────┘  │ Checkout (JS)   │
              │ Storage (POs) │               │ Webhooks ───────┼──► /api/webhooks/razorpay
              └───────────────┘               └─────────────────┘
                           │
              ┌────────────▼──────────────┐
              │ Google Apps Script + Sheet │  (contact form only)
              └───────────────────────────┘
```

Principles that shape every part of the system:

1. **The server decides.** Roles, user IDs, prices, totals and amounts are always derived on the server. Nothing the browser sends about identity or money is trusted.
2. **Two independent database gates.** A table `GRANT` and a row-level-security policy are separate checks. Both must exist and each is verified on its own.
3. **Business actions never fail because of email.** Every email send is non-fatal.
4. **Money paths are explicit.** Payment, refund and alert behavior is spelled out in code and tested against the real Razorpay test environment.

## 2. Code organization

- **Server Components by default.** Pages fetch data on the server. Client components exist only where interactivity requires them (forms, cart rows, catalog search, checkout).
- **Server Actions for all writes**, returning `{ success, error }`. Two route handlers exist: `/auth/confirm` (token verification) and `/api/webhooks/razorpay`.
- **Middleware** (`src/middleware.ts` → `utils/supabase/middleware.ts`) refreshes the Supabase session on every request by calling `getUser()`. The Next.js `middleware` filename is deprecated in favor of `proxy`; the build warns and no migration has been done.
- **Four Supabase clients:**
  - browser client, publishable key;
  - server client, cookie-based, publishable key, subject to RLS;
  - middleware client, session refresh only;
  - admin client (`createAdminClient`), secret key, **bypasses RLS**, server-only.

## 3. Data model

All tables are in `public` with UUID primary keys, created by the migrations in `supabase/migrations/`.

| Table | Key columns and rules |
| --- | --- |
| `categories` | `name`, `slug`, `product_type` (`medicine` or `device`), `display_order`. 17 therapeutic categories |
| `products` | `sap_code` (unique, nullable), `hsn_code`, `name`, `slug` (unique), `composition`, `category_id`, `dosage_form`, `manufacturer`, `brand_line`, `pack_size`, `case_size`, `mrp`, `sp`, `gst_percent` (default 5), `is_active`, `is_upcoming` |
| `profiles` | `id` = `auth.users.id`; `role` (`trade` or `admin`), `account_type` (`doctor`, `pharmacy`, `retailer`, `hospital`), `full_name`, `phone`, `is_active`, `password_set` |
| `trade_applications` | Applicant type and details, `status` (`pending`, `approved`, `rejected`), `rejection_reason`, `admin_notes`, `reviewed_by`, `reviewed_at`, `linked_profile_id`, plus `registration_number`, `licence_number`, `gst_number`, `authorized_signatory` per applicant type |
| `cart_items` | `user_id`, `product_id`, `quantity`; unique on (`user_id`, `product_id`) |
| `orders` | `user_id`, `status`, PO path and filename, `admin_feedback`, `subtotal_ex_gst`, `gst_amount`, `total_incl_gst`, `payment_method` (`cod` or `online`), `razorpay_order_id`, `razorpay_payment_id`, `payment_status` (`captured`, `refund_initiated`, `refunded`, `refund_failed`; null for COD), `razorpay_refund_id` |
| `order_items` | `order_id`, `product_id`, `quantity`, `unit_price_ex_gst_snapshot`. There is **no** `gst_percent` column |
| `order_status_history` | One row per transition: `status`, `note`, `changed_by` (always a real profile ID), `changed_at` |

Notes on the catalog:

- **228 products** from six source price lists: Axera Nexxon 60, Sorvus Franchisee 73, Axera Trion 19 (11 launched, 8 upcoming), Axera Critical Care 8, Axera Spectrum 68. A seventh sheet (GRPPL Critical Care) duplicated existing rows and added none.
- Upcoming products have `sp` null: they show on the public catalog with MRP but cannot be added to a cart.
- **Category and dosage form are separate axes.** Category is the therapeutic area (Antibiotics, Pain Management, …); dosage form is the physical form (tablet, syrup, capsule, injection, softgel-capsule, cream, gel, lotion, sachet, and a few others).
- The catalog is managed by SQL migrations. There is deliberately no catalog admin UI.
- `profiles` has no email column; email lives on `auth.users` and is fetched with the admin API when needed.

### Storage

One private bucket, `po-uploads`, holds purchase orders at `{user_id}/{timestamp}-{filename}`. A trade user can upload and read only their own files (policy on `owner_id`). Admin access goes through the admin client with signed URLs, so no admin storage policy exists.

### Database function

`public.check_auth_email_exists(check_email text)` is `security definer` and executable only by `service_role`. It reports whether an email exists in `auth.users`. It matches **exactly and case-sensitively**, so callers normalize case first.

## 4. Authorization

### Layers

1. **Session.** Middleware keeps the Supabase session fresh.
2. **Page gates.** `requireRole('admin' | 'trade')` reads the verified session and the user's `profiles` row. No user or no profile redirects to `/trade/login`. A role mismatch redirects to that user's real home (`getAuthHomeRoute`). A trade user who has not set a password is sent to `/trade/set-password`.
3. **Action gates.**
   - `requireTradeAccountReady()` returns `{ success, userId }` and checks login, the `trade` role and `password_set`. It runs before any data is read or changed in every trade action: add to cart, cart update and remove, checkout, Razorpay order creation, and order resubmission. (Input validation and the online-payment availability check may run just ahead of it, since they touch no data.)
   - Admin actions call `requireRole('admin')` and use the session user ID for attribution. The reviewer ID is never taken from the request.
4. **Row-level security** for reads a user may do themselves.
5. **Admin client** for trusted writes. Every action that uses it performs its own role and ownership checks first. The client's power is not itself an authorization check.

### Row-level security summary

| Table / object | Who can do what |
| --- | --- |
| `categories` | Anyone can read |
| `products` | Anyone can read active rows |
| `profiles` | A user can read their own row |
| `cart_items` | An authenticated user can read and write their own rows |
| `orders`, `order_items`, `order_status_history` | An authenticated user can read their own rows. All writes go through the admin client |
| `trade_applications` | No access for `anon` or `authenticated`. Only the admin client touches it |
| `storage.objects` (`po-uploads`) | A user can insert and read their own files |

**GRANT versus RLS.** Tables created by CLI migrations in this project did not receive automatic table grants. Postgres checks the grant before any policy, so every policy needs a matching explicit `GRANT`. Verify both separately: `pg_policies` for the policy, `information_schema.role_table_grants` for the grant.

### Account states

A trade account moves through: application (`pending`) → approved (auth user and profile created, `password_set = false`) → active (`password_set = true`). `password_set` exists because creating a profile at approval time and creating a session at invite click made "has a session" and "has finished onboarding" different facts.

- Trade pricing, cart, checkout and orders require `role = trade` **and** `password_set = true`.
- There is a single shared admin account (`admin@florus.in`), by decision.

## 5. Trade onboarding and account recovery

**Registration** (`/trade/register`, open to anyone) collects fields by applicant type:

| Type | Required beyond name, phone, email, address, city, state, pincode |
| --- | --- |
| Doctor | Medical registration number, hospital or clinic name |
| Pharmacy, Retailer | Firm name, drug licence number, GST number |
| Hospital | Institution name, hospital registration number, GST number, authorized signatory |

"Retailer" and "chemist" are one value, `retailer`. Validation repeats on the server. The email is trimmed and lowercased, then checked with `check_auth_email_exists`; an existing account is rejected with a message to contact the team. A rejected applicant can apply again, because rejection creates no auth user. Registration therefore reveals whether an email already has an account; this tradeoff is accepted.

**Approval** (admin):

1. `auth.admin.generateLink({ type: 'invite' })` creates the auth user and a token. `inviteUserByEmail` is not used: its implicit-flow tokens are incompatible with the PKCE client.
2. A `profiles` row is inserted (`role = trade`, `password_set = false`).
3. The application is marked approved and linked to the profile.
4. The applicant is emailed a link `…/auth/confirm?token_hash=…&type=invite&next=/trade/set-password`, and the same link is shown to the admin for manual relay.

If the profile insert fails after the user was created, the application is annotated in `admin_notes` for manual repair. **Rejection** requires a reason, stored in `rejection_reason` and emailed.

**Token confirmation.** `/auth/confirm` calls `verifyOtp({ type, token_hash })` through the cookie-based server client, which sets a real session. Recovery links get `?flow=recovery` appended. A failure goes to `/auth/error`, one generic message with a link to Forgot Password.

**Set password** (`/trade/set-password`):

- No session: redirect to `/auth/error`.
- Session and `password_set = true`: redirect home, unless `flow=recovery` is present with a session, which shows the form. A logged-in user can therefore change their own password by visiting that URL; this is accepted.
- Session and `password_set = false`: show the form (the invite flow).

On submit the action updates the password, then flips `password_set` and sends either the "welcome" email (first activation) or the "password changed" email. It decides by reading `password_set` **before** flipping it. Supabase's `same_password` rejection is shown as a specific message.

**Forgot password.** Always returns the same generic success, so it cannot be used to discover accounts. If the account exists (checked with the database function, retrying once with a lowercased address), a recovery link is generated and emailed through Resend, not through Supabase's own mailer.

`/trade/login` and `/trade/forgot-password` send already-signed-in users to their home. `/trade/register` stays open on purpose.

## 6. Catalog and pricing

**Browsing** (`/medicines`): category pills, brand pills and a dosage-form dropdown are real navigations (URL parameters, combined with AND, evaluated on the server). Search, sort (name A–Z, price low to high and high to low, items without a price last) and pagination (24 per page) are instant client-side state over the filtered set. Search matches product name and composition only.

**Who sees which price:**

| Viewer | Price shown |
| --- | --- |
| Anonymous, admin, trade user who has not set a password | MRP |
| Active trade user | Trade price, GST-exclusive |

**Trade price** = `sp × 1.10`, rounded to paise, **excluding GST**. GST comes from each product's `gst_percent` column, never a constant, and appears as its own line only at cart, checkout and order views. Worked example: CLAVIN-625, `sp` 74.00 → 81.40 ex-GST → 85.47 with 5% GST.

**Order totals** are computed in one place, `calculateCartTotal()`, which reads the cart and current product prices with the admin client. It rounds each line subtotal and each line's GST, sums them, and rounds the GST total. The cart and checkout pages compute their displayed numbers inline with the same pricing functions; the helper is the authority at order time.

Each order line stores `unit_price_ex_gst_snapshot`, written once and never recalculated, so changing a product's `sp` later never changes an existing order.

## 7. Cart and checkout

- The cart is stored in the database, not in browser storage, because browser-stored carts leaked between users sharing a browser.
- **Adding** an item adds to the quantity already in the cart. A per-item cap of 9,999 applies to the resulting total and returns a clear error. The read-then-write is not atomic, so two simultaneous adds from different tabs can undercount; the add button disables while a request is in flight.
- **Editing** a quantity saves on blur or Enter, validates 1–9,999, and reverts to the last saved value on any failure. Unpriced (upcoming) products cannot be added and block checkout if present.
- **Checkout** requires a purchase order (PDF, JPG or PNG, up to 10 MB) for every order, whatever the payment method. The delivery address is the one on the approved registration and is shown read-only. There is no address override, because Florus is a licensed wholesaler and the delivery address is part of the verified registration.
- The payment method is a required choice with nothing preselected. "Pay Online" is rendered only when `isOnlinePaymentEnabled()` is true; both server actions refuse an online payment when it is false, and reject any method other than `cod` or `online`.

## 8. Order lifecycle

```
pending_verification ─► approved ─► fulfilled
        │
        ├─► rejected          (terminal; online payments refunded automatically)
        └─► needs_revision ─► pending_verification   (trade user resubmits a new PO)
```

- Admin transitions: `pending_verification` → `approved`, `rejected` or `needs_revision`; `approved` → `fulfilled`. The trade user's only transition is resubmission from `needs_revision`. The rules live in `utils/orders/transitions.ts`.
- Every transition re-reads the order's **current** status from the database immediately before acting, validates the transition, then writes the status and a history row. This prevents a stale or double-submitted form from moving an order that has already moved.
- Resubmission also verifies ownership and that the status is exactly `needs_revision`, and validates the new file's type and size on the server. It clears `admin_feedback` and leaves payment data untouched.
- Rejection and revision both require written feedback, which is emailed to the customer.
- Admins view the PO through two signed URLs (inline preview and forced download).

## 9. Online payments (Razorpay)

### Checkout flow

1. The user selects Pay Online, uploads the PO and presses Proceed to Payment.
2. `createRazorpayOrderAction`: availability gate → account gate → server-side cart total → Razorpay order for that amount in paise (`INR`, `notes.userId`). It returns the order ID, amount and public key ID.
3. The browser loads Razorpay Checkout dynamically and opens the modal.
4. On success the browser calls `submitOrderAction` with the PO file and Razorpay's order ID, payment ID and signature.
5. The server validates the method, the availability gate and the account, verifies the HMAC-SHA256 signature of `order_id|payment_id` with the API secret, recomputes the cart total, uploads the PO, and inserts the order (`payment_status = captured`), items and history. It then clears the cart and sends emails.
6. If the user closes the modal, no order is created and no money moves.

### Availability gate

`isOnlinePaymentEnabled()` is true only when `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` are all present and non-empty, and, in a production build, the key ID starts with `rzp_live_`. The Razorpay SDK client throws at import if its keys are missing, so it is imported dynamically and only after the gate passes. Going live therefore needs configuration, not code changes.

### Rejection and refunds

Rejecting an order that was paid online (`payment_method = online`, `payment_status = captured`) issues a **full refund** for the order total:

- The rejection is saved first and always stands.
- On success the order gets `refund_initiated` and the refund ID; Razorpay's `refund.processed` webhook later sets `refunded`.
- On failure the order gets `refund_failed` and a red urgent alert goes to `ADMIN_EMAILS`.

`needs_revision` and resubmission never touch payment fields.

### Webhook (`/api/webhooks/razorpay`)

The handler reads the raw body and verifies `X-Razorpay-Signature` against `RAZORPAY_WEBHOOK_SECRET`. A missing or invalid signature returns 400; a missing secret returns 500. Valid events are handled and the handler returns 200 even on internal errors so Razorpay does not retry endlessly. It runs with `maxDuration = 60`.

| Event | Behavior |
| --- | --- |
| `payment.captured` | Looks for an order with that payment ID. If none exists yet, a background task (`after()`) re-checks every 5 seconds for up to about 40 seconds. If an order appears, nothing happens. If none appears, an *Orphaned Payment* alert is emailed. The grace window exists because this event can arrive before the checkout action has inserted the order |
| `refund.processed` | Finds the order by refund ID, falling back to payment ID, and sets `payment_status = refunded` |
| `refund.failed` | Sets `refund_failed` and emails an urgent alert |

Alert emails are awaited (directly, or inside `after()`), because un-awaited work after a serverless response is not guaranteed to complete.

### Test and live modes

Razorpay webhooks are registered per account and per mode. Test-mode events for locally created payments reach the production URL, and because local and production share one database, the production endpoint updates those orders. Live mode needs its own webhook and secret.

## 10. Email

- **Resend** sends all mail from `Florus Enterprises <team@florus.in>` with reply-to `team@florus.in`. The domain's DKIM and SPF records are verified.
- `sendEmail()` never throws; it returns `{ success, error }`. Callers log failures and continue.
- Eighteen templates in `utils/email/templates.ts`: trade application (applicant, admin), approved, rejected, account activated; order submitted (customer, admin), approved, rejected, needs revision, resubmitted (customer, admin), fulfilled; contact confirmation; password reset, password changed; and two red alert templates (orphaned payment, refund failed) with their own wrapper.
- Admin notifications go to the `ADMIN_EMAILS` list.
- Password-reset and invite emails go through Resend rather than Supabase's mailer, which needs custom SMTP before its templates can be edited.

## 11. Contact form

A client form posts to a server action. A hidden `website` field is a honeypot: if filled, the submission is silently discarded. Otherwise the server posts the fields to the Google Apps Script URL (as `text/plain`), which stores them in a Sheet and notifies the admins, and then sends the visitor a confirmation through Resend. A failed confirmation email does not fail the submission.

## 12. Design system

- **Type:** page title `text-4xl font-bold` (home hero `text-5xl md:text-6xl`); section heading `text-2xl font-semibold`; card heading `text-lg font-semibold`; body `text-base`; secondary `text-sm text-gray-600`; captions `text-xs text-gray-500`.
- **Spacing:** page container `py-12` (marketing pages `py-16`), rhythm `space-y-6` or `gap-6`, card padding `p-6`, widths `max-w-4xl` (dashboard and admin `max-w-6xl`).
- **Color:** brand blue `#009EE0` for interactive elements only, never large fills. Primary button `bg-[#009EE0] hover:bg-[#0088c7]`; secondary button gray border.
- **Cards:** `border border-gray-200 rounded-lg p-6`, with `hover:border-[#009EE0] hover:shadow-md`.
- **Responsive:** mobile first; `sm:`, `md:` and `lg:` breakpoints for columns. Admin pages are denser but follow the same scale.

## 13. Environments

| Concern | Local | Production |
| --- | --- | --- |
| Supabase project | Shared | Shared |
| Resend | Same account and sender | Same |
| Razorpay | Test keys in `.env.local` | No API keys; test webhook secret only, until go-live |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | `https://www.florus.in` |
| Online payment | Visible (test keys) | Hidden (no live keys) |

## 14. Deliberate decisions

| Decision | Reason |
| --- | --- |
| Rebuilt on Next.js and Supabase | The earlier Express, React and Drizzle version was discarded |
| Resend, not Nodemailer or Supabase mail | Gmail app-password limits made SMTP fragile; Supabase's mailer is locked without custom SMTP |
| Registration details are read-only | Approval verifies them; changes go through the team |
| Fixed registered delivery address | Chain of custody for a licensed wholesaler |
| PO required for every order | Verification applies regardless of payment method |
| Refund only on rejection | Needs-revision orders are expected to come back |
| Single shared admin account | Accepted by the owner; no multi-admin plan |
| Admin sees public pricing when browsing | Trade pricing is for trade accounts |
| No catalog admin UI | Catalog changes are reviewed SQL migrations |
| Public repository | Vercel Hobby cannot build private organization repositories; history was scanned for secrets first |

## 15. Known limitations

- The database cannot yet be bootstrapped with a single command (categories are seeded outside migrations); see the README.
- Local development and production share one Supabase project.
- The first-checkout purchase order is validated for type and size in the browser; resubmission validates on the server.
- The orphan-payment grace window is a heuristic. A purchase-order upload slower than about 40 seconds would still produce an alert, which is why the alert tells admins to check first.
- If an order insert fails after the PO upload, the file is orphaned and only logged for manual cleanup.
- `/trade/dashboard` checks the role itself instead of using `requireRole`, so it does not redirect an account that has not finished onboarding.
- Production observability is thin: Vercel Hobby keeps runtime logs only briefly and Razorpay's test dashboard shows no webhook delivery history.
