# Progress — Florus Enterprises

A dated log of what was built, the decisions behind it, and what was verified. Each entry records the final state of that checkpoint. Bugs found and their root causes are in [TROUBLESHOOTING.md](TROUBLESHOOTING.md); the system itself is described in [ARCHITECTURE.md](ARCHITECTURE.md).

Dates come from migration timestamps, commits and deployment records. Entries marked "Sep 2026" have no recorded day. "Verified" always means a real observation (a terminal result, a database row, or a browser test), never code inspection alone.

## Current state (October 14, 2026)

- Live at <https://www.florus.in>: public catalog of 228 products, trade registration and approval, trade pricing, cart, checkout with purchase-order upload, admin order review, and transactional email.
- **Cash on delivery is live. Online payment is built and tested in Razorpay test mode but hidden in production** until live keys exist (account activation pending).
- Test-mode refund path verified end to end, including the webhook that marks refunds complete.

## Planned before go-live

- Seed categories in a migration so a new database builds in one step.
- Razorpay account activation, live keys and a live webhook (steps in the README).
- Florus to supply the missing SAP code for TELMICLAR TAB 40MG,15'S.

---

## Foundation

### Checkpoint 1 — Scaffolding · Aug 27, 2026
- Next.js (App Router, TypeScript, Tailwind, `src/`). Supabase client helpers: browser, cookie-based server, middleware.
- Middleware calls `getUser()`, which is what makes session refresh work.
- Supabase CLI linked. Connection verified with a real round-trip query.

### Checkpoint 2 — Schema and seed data · Aug 27, 2026
- Eight tables with RLS enabled from the start. 17 categories (deduplicated from inconsistent spellings across price lists). 23 sample products, including two unpriced "upcoming" ones.
- Public read policies for categories and active products.

### Checkpoint 3 — Public site and catalog · Aug 27, 2026
- Home, About, Contact, Medicines (search and category filter), product detail. Categories read live from the database.
- Found and fixed: policies without matching `GRANT`s caused `permission denied`. Verified through both `pg_policies` and `role_table_grants`.

### Checkpoint 4 — Auth, registration and approval · Aug 28, 2026
- Session auth, `requireRole()`, trade registration, admin applications queue.
- Decision: invites use `generateLink` and a `/auth/confirm` route (PKCE-compatible), not `inviteUserByEmail`.
- Idempotent `seed-admin.ts`. Fixed trade profiles missing `account_type` and applications missing `linked_profile_id`.
- Verified: real registration, approval, invite click, password set and login in a browser.

### Checkpoint 5 — Trade pricing, cart and checkout · Aug 28, 2026
- Trade price = `sp × 1.10`, GST-exclusive, GST shown only at cart and checkout. Server-side cart. Checkout with required PO upload to a private bucket. Immutable price snapshots.
- Found and fixed before any real order: a nonexistent `gst_percent` insert, and order GST hardcoded at 5%.
- Verified: checkout with a real PO file, and snapshot immutability (changing a product's `sp` left an existing order's price unchanged).
- Correction recorded later: this entry originally claimed quantity editing was verified. It was not; editing never saved until Checkpoint 31.

### Checkpoint 6 — Admin order review · Aug 29, 2026
- Order state machine, admin order list and detail, PO preview and download, revision and resubmission loop. Every action re-reads the order's current status before acting.
- Found and fixed: a query selected `profiles.email`, which does not exist.
- Verified: approve, reject, needs-revision then resubmit, approve then fulfill, an illegal transition refused, and both resubmission guards.

### Checkpoint 7 — Full catalog import · Sep 2, 2026
- 228 products from six price lists (Nexxon 60, Sorvus 73, Trion 19, Critical Care 8, Spectrum 68). A seventh sheet added nothing (all duplicates).
- Open data issue: "TELMICLAR TAB 40MG,15'S" imported with no SAP code because the source reused another product's code.

### Checkpoint 8 — Design consistency pass · Sep 4, 2026
- One type scale, spacing rhythm, color rule and card style across every page. Session-aware header. Responsive layouts audited.
- Visual quality was judged by the owner in a browser.

---

## Operations and polish

### Deployment · first production environment variables Sep 6, 2026
- Deployed on Vercel at `www.florus.in` (`florus.in` redirects to it).
- Decision: the repository was made public because Vercel Hobby cannot build private organization repositories. A full history scan for secrets found nothing first.

### Checkpoint 9a — Rejection reasons · Sep 6, 2026
- `trade_applications.rejection_reason` and a reject control that requires a reason.

### Checkpoint 9b — Transactional email · Sep 2026
- Resend with a verified `florus.in` domain. 13 lifecycle templates wired into the actions. Rule: an email failure never breaks the business action.
- Admin notifications go to three addresses. Verified in a manual pass.

### Checkpoint 9c — Duplicate-account guard · Sep 6, 2026
- `check_auth_email_exists` (security definer, service role only) called at registration. Approved but not-yet-active emails are blocked; rejected applicants can reapply.

### Checkpoints 10–12 — Catalog browsing · Sep 2026
- Instant client-side search (name and composition), category and brand pills, dosage-form dropdown (server-side URL filters, combined), sort, and 24-per-page pagination.

### Checkpoint 13 — Logo and favicons · Sep 2026
- SVG logo as a plain `<img>`, favicon set and web manifest.

### Checkpoint 14 — Contact form · Sep 2026
- Server action posting to Google Apps Script, honeypot field, Resend confirmation to the visitor. Fixed a stale form reference after `await`.

### Checkpoints 15–23 — Authentication hardening · Sep 2026 (migration Sep 8)
- Signed-in users redirected away from login and forgot-password; registration left open on purpose.
- `profiles.password_set` introduced after a redirect change broke the real invite flow. Page gate (`requireRole`) and action gate (`requireTradeAccountReady`) both enforce it.
- Forgot-password flow with generic responses; recovery links via Resend; `flow=recovery` handling after recovery links bounced to the dashboard.
- Welcome email only on first activation, "password changed" email afterwards.
- A single shared admin account was accepted.
- All flows tested in a browser.

### Checkpoint 24 — Real site copy · Sep 2026
- Home, About, Contact, footer and metadata rewritten from the owner's content pool. No import/export licence number or capability is shown, because it is inactive.

### Checkpoint 25 — Registration fields, PO preview, account details · Sep 11, 2026
- Per-applicant-type fields (new `gst_number` and `authorized_signatory`), validated on the server.
- PO preview at checkout. Dashboard shows full read-only registration details. Checkout shows a fixed delivery address.
- Decisions: no self-service edits and no delivery-address override.
- Fixed a helper that silently returned null for the locked-down applications table. All four applicant types tested.

---

## Payments

### Checkpoint 26 — Razorpay online payment · Sep 13, 2026
- Cash on delivery or Pay Online; nothing preselected; PO required for both. Totals computed on the server. Checkout signature verified before the order is created.
- New payment columns on `orders`; payment details on trade and admin order pages.
- Verified in test mode: COD unchanged, online success, failure screen, and modal dismissal.

### Checkpoint 27 — Refunds and webhook · Sep 2026
- Rejecting a captured online order refunds it in full automatically. The rejection stands even if the refund fails, which raises an urgent alert.
- Webhook handles `payment.captured`, `refund.processed` and `refund.failed`.
- Found and fixed: alert emails used a nonexistent variable and went to nobody.
- Verified: approve path; a refund failure produced the alert email. Remaining tests were completed in Checkpoints 28–29 (below).

### Checkpoint 28 — Online payment availability gate · Oct 13, 2026
- Pay Online appears only when all three Razorpay variables are set and, in production builds, the key is a live key. Both server actions refuse online payment otherwise and validate the payment method.
- Verified: option present locally, hidden when the webhook secret was removed, and hidden on the production checkout.

### Checkpoint 29 — Orphan-payment grace window · Oct 14, 2026
- A captured payment with no order is re-checked for about 40 seconds before alerting. Alert emails are awaited.
- Verified: a signed fake event produced one alert after about 45 seconds; a real paid order produced none; rejection still moved the order to `refunded` through the production webhook; marking an order needs-revision left the payment `captured` with no refund, and a later rejection after resubmission refunded normally.
- Also verified on production: missing and invalid webhook signatures return 400.

---

## Hardening and cleanup

### Checkpoint 30 — Pagination-safe reset, cart gates, dead code · Oct 14, 2026
- Password-reset lookup uses `check_auth_email_exists` instead of the first page of users.
- Cart update and remove use the account gate; quantity validated as an integer from 1 to 9,999.
- Removed two unused files. Verified: the build passes, and the reset email arrives for an existing account but not for an unknown one.

### Checkpoint 31 — Cart quantity, registration email, password message · Oct 14, 2026
- Cart quantity edits now save (the bug had existed since Checkpoint 5). Registration lowercases email. A reused password gets a clear message.
- Verified in a browser: edit saves and survives refresh; 0, blank and 10,000 revert; Enter saves; remove works; `Doctor@florus.in` is blocked as a duplicate.

### Checkpoint 32 — Add to cart increments · Oct 14, 2026
- Adding an item already in the cart adds to its quantity, capped at 9,999 with a clear error.
- Verified in a browser: 5 then 3 gives 8; adding 9,992 more is refused; a second product adds normally.

### Checkpoint 33 — Admin role enforced on application actions · Oct 14, 2026
- Approve and reject now verify the admin role on the server and take the reviewer from the session instead of the submitted form.
- Every other server action was audited: all 18 are either gated (`requireRole` or `requireTradeAccountReady`), tied to the session, or intentionally public (contact, login, registration, forgot-password).
- Verified on production: three approvals (invite link shown to the admin and emailed) and one rejection with a reason (emailed). On all four applications `reviewed_by` was the admin's profile ID taken from the session, and approved applicants received profiles.

### Documentation rewrite · Oct 14, 2026
- README, ARCHITECTURE, TROUBLESHOOTING and PROGRESS rewritten as consolidated documents, with a proprietary-software notice in the README.

### Checkpoint 34 — Payment verification hardened · Oct 15, 2026
- Payment verification added before order creation: amount, status, ownership and uniqueness all checked against Razorpay. Payment signature comparison now uses `crypto.timingSafeEqual` (constant-time). Unique partial indexes prevent payment ID reuse. Duplicate payment use returns a clear error and deletes the uploaded PO.
- Verification retries up to 4 times (1 second apart) if payment status is not `captured` yet.
- Files: `verify-payment.ts` created, `actions.ts` updated with verification call and 23505 handling, migration adds unique indexes on `razorpay_payment_id` and `razorpay_order_id`.
- Verified: build passes. Test script confirmed Razorpay API returns `amount` as number (paise), `payment.captured` as boolean, and `order.notes.userId` as string.
