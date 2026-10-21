# Progress — Florus Enterprises

A dated log of what was built, the decisions behind it, and what was verified. Each entry records the final state of that checkpoint. Bugs found and their root causes are in [TROUBLESHOOTING.md](TROUBLESHOOTING.md); the system itself is described in [ARCHITECTURE.md](ARCHITECTURE.md).

Dates come from commit dates, migration timestamps and deployment records. Entries marked "Sep 2026" have no recorded day. "Verified" always means a real observation (a terminal result, a database row, or a browser test), never code inspection alone.

## Current state (October 18, 2026)

- Live at <https://www.florus.in>: public catalog of 228 products, trade registration and approval, trade pricing, cart, checkout with purchase-order upload, admin order review, and transactional email.
- **Cash on delivery is live. Online payment is built and tested in Razorpay test mode but hidden in production** until live keys exist (account activation pending).
- Online payments are verified with Razorpay before an order exists (captured, same order, same user, exact cart total), one payment can back only one order, and a payment made after the cart changed is refunded automatically.
- Test-mode refund path verified end to end, including the webhook that marks refunds complete.
- Purchase-order files are validated by real content on the server, emails escape typed text, and a Vercel Firewall rule rate-limits the public forms.

## Planned before go-live

- Razorpay account activation (including the paused-settlement issue), live API keys and a live webhook (steps in the README), then a small real-payment check.
- Remove or secure the demo trade accounts, clear test orders, and decide whether production should have its own Supabase project (local development and production share one today).
- Record a behavioral test of the rate-limit rule (about a dozen rapid submissions of the forgot-password form should be refused with 429).
- Seed categories in a migration so a new database builds in one step.
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

### Checkpoint 27 — Refunds and webhook · Sep 20–23, 2026
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

### Checkpoint 33 — Admin role enforced on application actions · Oct 15, 2026
- Approve and reject now verify the admin role on the server and take the reviewer from the session instead of the submitted form.
- Every other server action was audited: all 18 are either gated (`requireRole` or `requireTradeAccountReady`), tied to the session, or intentionally public (contact, login, registration, forgot-password).
- Verified on production: three approvals (invite link shown to the admin and emailed) and one rejection with a reason (emailed). On all four applications `reviewed_by` was the admin's profile ID taken from the session, and approved applicants received profiles.

### Documentation rewrite · Oct 15, 2026
- README, ARCHITECTURE, TROUBLESHOOTING and PROGRESS rewritten as consolidated documents, with a proprietary-software notice in the README.

### Checkpoint 34 — Online payments bound to their order · Oct 15, 2026
- Before an order is created, the server fetches the payment and its Razorpay order and requires: payment captured, belonging to that Razorpay order, in INR, for exactly the server-computed cart total, and created for the same user. The checkout signature is now compared in constant time.
- Unique database indexes allow only one order per Razorpay payment and per Razorpay order. A duplicate is refused with a clear message.
- Razorpay's API was checked against a real test payment first: amounts are numbers in paise, a fully refunded payment reads `status: refunded` (so refunded payments cannot be reused), and the Razorpay order carries the user ID.
- Verified: index migration applied and a duplicate insert rejected (`23505`); a normal paid order created, rejected and refunded, with the webhook setting `refunded`; and a payment made after the cart changed was refused with no order created.

### Checkpoint 35 — Friendly payment errors and automatic refund · Oct 17, 2026
- Customer-facing payment errors are now fixed friendly sentences with no amounts or exception text; details go to the server log.
- When a genuine payment belonging to the caller's own Razorpay order no longer matches the cart (the cart changed while paying), it is refunded in full automatically and the customer is told. No refund is attempted when the payment's order, currency or owner does not match.
- Verified: a normal paid order still worked and was refunded on rejection; a cart changed during payment produced the friendly message, a full refund in Razorpay and no order. An orphaned-payment alert still arrived, which led to Checkpoint 36.

### Checkpoint 36 — Ledger of automatic refunds · Oct 17, 2026
- New `auto_refunds` table (service role only), written when an automatic refund succeeds. The webhook's orphan check consults it instead of the Razorpay API, because the webhook runs on production, which has no API keys.
- Verified: the ledger row was written, no orphan alert arrived for two minutes, a signed fake orphan with no ledger row still alerted about 45 seconds later, and a normal order and refund were unaffected.

### Vercel Firewall rate limit · Oct 17, 2026
- One custom rule, "Protect Public Forms": POST to `/contact`, `/trade/forgot-password`, `/trade/register` and `/trade/login`, fixed window of 60 seconds, 10 requests per IP, response 429. It saved on the Hobby plan with no pricing prompt.
- Verified: the rule is configured and enabled in the dashboard. A behavioral test has not yet been recorded.

### Checkpoint 37 — Purchase-order validation by real content · Oct 17, 2026
- One shared module (browser and server) checks size, emptiness and the file's actual leading bytes (PDF, JPEG, PNG); storage paths are sanitized and use the detected extension and content type. Resubmission uses it too.
- Verified: the byte detection and path sanitizing against crafted inputs; in the browser a text file renamed `.pdf` and an 11 MB file were refused; a JPG order, an online-payment order (clean path) and a resubmission all worked.

### Checkpoint 38 — Email escaping · Oct 18, 2026
- All typed text in email HTML bodies is escaped; line breaks are stripped from user-supplied parts of subjects.
- Verified: hostile input produced no live markup in four templates and a one-line subject; a real application named `<b>Test</b> & Co` showed literally in the admin email and admin page.

### Checkpoint 39 — Reset script, cart double-save, dead constants · Oct 18, 2026
- The reset script now deletes pending and rejected applications, requests real counts, and clears `auto_refunds`. The cart no longer saves twice on Enter followed by blur. Two unused constants were removed.
- The script's first run stopped at the ledger step because the service role had no `DELETE` on `auto_refunds`; a small migration granted it.
- Verified: one cart request per Enter-then-blur; after the grant, a reset run deleted one ledger row and one pending application, and the verification matched exactly (0 carts, 0 orders, 0 refunds, 4 applications, 4 profiles, 5 auth users).

### Documentation refresh · Oct 18, 2026
- README, ARCHITECTURE, TROUBLESHOOTING and PROGRESS rewritten again as whole documents covering Checkpoints 34–39, the refund ledger, PO validation, email escaping, the rate-limit rule and the grant lesson.
