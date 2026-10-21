# Troubleshooting — Florus Enterprises

Real problems met while building and testing this platform, with their **actual root causes**, how each was fixed, and the lesson. Entries are grouped by area. Each says what is proven and, where it applies, what is still unknown. Architecture is in [ARCHITECTURE.md](ARCHITECTURE.md).

## Contents

1. [Database and Supabase](#1-database-and-supabase)
2. [Authentication and onboarding](#2-authentication-and-onboarding)
3. [Catalog, cart and orders](#3-catalog-cart-and-orders)
4. [Payments and webhooks](#4-payments-and-webhooks)
5. [Email](#5-email)
6. [Tooling and process](#6-tooling-and-process)

---

## 1. Database and Supabase

### 1.1 `permission denied for table X` despite a correct RLS policy or grant

- **Symptom:** a table with RLS enabled and a correct policy still failed with `permission denied`.
- **Root cause:** Postgres checks the table-level `GRANT` for the role first and evaluates policies only if that passes. Tables created by Supabase CLI migrations in this project did not receive automatic grants. The gap appeared for `products` and `categories`, for `profiles` (reads and the service role's writes), and was then closed pre-emptively for the cart, order and storage tables.
- **It happened again with `auto_refunds`:** the table was created with `grant select, insert` for the service role, and a later script tried to `delete` from it, which failed with `42501`. The error's hint named the missing grant.
- **Fix:** pair every policy with an explicit `GRANT` migration covering **every operation the app and its scripts use**, and verify both independently: `pg_policies` for the policy, `information_schema.role_table_grants` for the grant.
- **Lesson:** a verified policy, or a partial grant, is not evidence that access works. Read the grant list against what the code actually does.

### 1.2 `order_items` insert failed: `gst_percent` does not exist

- **Symptom:** the first real checkout would have failed with "column does not exist" (caught in an audit before any real order).
- **Root cause:** the insert assumed a column that was never in the schema. Earlier checks were arithmetic and standalone calculations, never an actual insert.
- **Fix:** remove the field. Confirmed with a real end-to-end order.
- **Lesson:** a correct calculation and a successful insert are different claims. The same pattern caused 1.3.

### 1.3 Admin order pages crashed: `profiles.email` does not exist

- **Root cause:** another unverified schema assumption. Email lives only in `auth.users`.
- **Fix:** fetch it with `auth.admin.getUserById`.

### 1.4 Product with no SAP code: two products shared one

- **What happened:** the Axera Trion price list gave "TELMICLAR AM TAB 40/5MG,15'S" and "TELMICLAR TAB 40MG,15'S" the same SAP code. `sap_code` is unique, so both could not be stored.
- **Resolution:** the second product was imported with `sap_code = NULL` rather than an invented code. This is a source-data error. **Still open:** Florus must supply the correct code.

### 1.5 Deleting an uploaded file with SQL does not delete it

- **Root cause:** `storage.objects` is metadata. Deleting a row does not remove the object from the storage backend, and the two drift apart.
- **Fix:** always use the Storage API (`storage.from(bucket).remove([...])`).

### 1.6 Brand-new database cannot be built in one step

- **Root cause:** the full-catalog migration selects category IDs, but categories are seeded by `supabase/seed.sql`, which `db push` does not run. The production database grew incrementally, which hid this.
- **Status:** documented in the README with a workaround that has not been exercised end to end. The real fix is to seed categories in a migration.

### 1.7 The legacy-versus-new Supabase key names

- The project uses `sb_publishable_…` and `sb_secret_…` keys. The secret's variable is exactly `SUPABASE_SECRET_KEY`. Scripts copied from generic examples used `SUPABASE_SERVICE_ROLE_KEY` and failed.

### 1.8 `listUsers()` silently checks only the first 50 users

- **Symptom (latent):** the password-reset flow decided whether an account exists with `auth.admin.listUsers()` and `.some()`. Supabase's documentation confirms `listUsers` returns 50 users per page by default, so users beyond page one would never get a reset email.
- **Fix:** use the existing `check_auth_email_exists` function instead.
- **Lesson:** never answer an existence question by scanning a paginated list.

### 1.9 Email lookup is case-sensitive

- **Proven by test:** `check_auth_email_exists('doctor@florus.in')` returns true and `'DOCTOR@FLORUS.IN'` returns false.
- **Consequence:** registering `Doctor@florus.in` bypassed the duplicate-account check.
- **Fix:** registration trims and lowercases email before every use; password reset retries once with a lowercased address.

### 1.10 The reset script left pending and rejected applications behind

- **Symptom:** after a reset, the verification step reported 5 applications where 4 (the demo accounts) were expected.
- **Root cause:** the script deleted applications whose `linked_profile_id` was `NOT IN` the preserved IDs. In SQL, `NULL NOT IN (...)` is never true, and pending or rejected applications have no linked profile, so they were never deleted. Its "Deleted N" lines were also meaningless, because the delete calls did not request a count and the script printed 0.
- **Fix:** the script now fetches the applications, chooses in code the ones to delete (no linked profile, or linked to a non-demo account), deletes by ID, requests real counts on every delete, and also clears `auto_refunds`.
- **Verified:** a run reported real counts, deleted a pending application and one ledger row, and the verification matched (0 carts, 0 orders, 0 refunds, 4 applications, 4 profiles, 5 auth users). Its first run stopped at the ledger step for the reason in 1.1.

---

## 2. Authentication and onboarding

### 2.1 Invite links never established a session

- **Root cause:** Supabase's default invite email uses the implicit flow, putting tokens in the URL hash, which the server never sees. The project's `@supabase/ssr` browser client uses PKCE, which expects a `?code=` parameter. The two are incompatible.
- **Fix:** `auth.admin.generateLink({ type: 'invite' })` returns a hashed token to server code. The invite URL points to `/auth/confirm?token_hash=…&type=invite&next=…`, a route handler that calls `verifyOtp` through the cookie-based client, which sets the session. Supabase's default mailer cannot edit templates without custom SMTP, so the link is emailed through Resend.

### 2.2 Redirecting signed-in users away from set-password broke the real invite flow

- **Symptom:** after a "harden auth" change, clicking a genuine invite link bounced the applicant away.
- **Root cause:** the invite click creates a session, and the trade profile already exists at approval time. "Has a session and a trade profile" therefore did not mean "has finished onboarding".
- **Fix:** an explicit `profiles.password_set` flag, default false, set when the password is chosen. Page and action gates use it.
- **Lesson:** model state explicitly instead of inferring it from other facts.

### 2.3 Recovery links for existing accounts landed on the dashboard

- **Root cause:** a working account already has `password_set = true`, so the set-password page redirected a valid recovery session away.
- **Fix:** `/auth/confirm` adds `?flow=recovery` for recovery tokens; the set-password page shows the form when that flag and a session are both present. A signed-in user can reach the form by visiting that URL, which is accepted.

### 2.4 A helper silently returned nothing for a locked-down table

- **Symptom:** the registration-detail lookup returned null for every user.
- **Root cause:** it used the RLS-bound client against `trade_applications`, which deliberately has no grants for `anon` or `authenticated`. The query was denied and the helper treated the error as "no data".
- **Fix:** use the admin client in that one helper, which is only ever called with a verified session's user ID.

### 2.5 Application approve and reject trusted the caller

- **Symptom (found in review, not by a user report):** the two application actions took `adminUserId` from the submitted form and never verified the caller was an admin, while using the service-role client. Approval returns a live invite URL.
- **Fix:** both actions call `requireRole('admin')` first and use the session user as the reviewer. The client no longer sends an ID. A full audit then confirmed every other exported action is gated, tied to the session, or intentionally public.
- **Lesson:** a Server Action is a public endpoint. Page-level checks do not protect it; each action needs its own check.

### 2.6 A reset showed "Failed to set password" for reusing the old password

- **Root cause:** Supabase rejected the update with code `same_password`; the action mapped every error to one generic message.
- **Fix:** that code now returns "Your new password must be different from your current password."

### 2.7 Contact form crashed after submit

- **Root cause:** `e.currentTarget` is null after an `await`. The form reference must be captured synchronously.

---

## 3. Catalog, cart and orders

### 3.1 Order GST was silently fixed at 5%

- **Root cause:** the order's total GST was computed as 5% of the subtotal, discarding the correct per-line GST already computed. Every product happened to be 5%, so nothing looked wrong.
- **Fix:** sum the per-line GST. Verified by temporarily adding an 18% product to a real order.
- **Lesson:** a bug that only appears with data the dataset does not contain is still a bug. Test a deliberately different case.

### 3.2 Cart quantity edits never saved

- **Symptom:** changing a quantity updated the row on screen, but the total stayed, and a refresh restored the old value. No network request was made.
- **Root cause:** the input's change handler updated the quantity state on every keystroke, and the blur handler then compared the typed value to that same state ("did it change?"). It was always equal, so it returned before calling the server. The failure-revert path restored the already-changed value, so it could not revert anything.
- **History:** present since the commit that introduced the cart. An earlier progress entry claimed quantity editing was verified in a browser; that claim was wrong.
- **Fix:** keep the last saved quantity separate from the text in the input; save on blur or Enter; revert to the saved value on any failure.
- **Lesson:** "verified" must name the evidence. A claim without a recorded observation is a guess.

### 3.3 "Add to Cart" replaced the quantity

- **Root cause:** the upsert overwrote the existing quantity while a comment claimed it incremented. Adding 5 and then 3 left 3.
- **Fix:** read the current quantity, add, and cap the total at 9,999 with a clear error.

### 3.4 One quantity edit saved twice

- **Symptom:** the server log showed two cart-update calls after pressing Enter in the quantity box.
- **Root cause:** Enter started a save; disabling the input while it ran made the field lose focus, and the blur started a second save before the first had finished.
- **Fix:** a ref-based in-flight guard at the top of the save function.
- **Verified:** one request per Enter-then-blur.

### 3.5 The server trusted the browser's file type and filename

- **Found in review:** the first-checkout purchase order was checked for type and size only in the browser; the server stored it under the browser-declared content type, with the raw filename in the storage path.
- **Fix:** one shared module identifies PDF, JPEG and PNG by their actual leading bytes and checks size and emptiness, and runs in the browser and on the server. Storage paths use a sanitized name and the detected extension; the stored content type is the detected one.
- **Design point:** because the browser runs the same check, a genuine file never passes the client and then fails on the server after an online payment has been taken.
- **Verified:** the logic against crafted bytes and hostile names; in the browser, a text file renamed `.pdf` and an 11 MB file were refused; real PDF, JPG and PNG orders and a resubmission worked.

---

## 4. Payments and webhooks

### 4.1 Refund alerts went to nobody

- **Root cause:** the code read `process.env.ADMIN_EMAILS`, a variable that does not exist; the recipients are a constant exported from `admin-recipients.ts`. Sending to an undefined address silently did nothing.
- **Fix:** use the constant. Proven when a real refund failure produced the alert email.

### 4.2 One refund failed with Razorpay `BAD_REQUEST_ERROR`

- **Facts:** the amount was a number and the paise value (527258) was correct. The identical retry succeeded.
- **Cause: unknown.** Diagnostics were added, showed nothing wrong, and were removed. One failure in total. Monitor; if it recurs, escalate to Razorpay support with the request details.

### 4.3 Test webhooks cannot reach localhost, and test-mode visibility is poor

- Webhooks are registered per Razorpay account and mode. A webhook pointing at the production URL never receives events from a local server, but it **does** receive events for locally created test payments, because those are account events.
- Because local and production share a Supabase project, the production endpoint updates locally created orders. This is how the `refunded` transition was verified.
- The Razorpay test dashboard showed no delivery history. Vercel Hobby runtime logs last only briefly. Plan production tests so the evidence can be read promptly.
- Razorpay's documented behavior: non-2xx responses are retried with backoff for 24 hours, a webhook that keeps failing is disabled, and failed events can be replayed for 15 days.
- Webhook route checks: an invalid or missing signature returns 400 (verified against production). A missing secret would return 500, so a 400 on a bogus signature also proves the secret is configured.

### 4.4 "Pay Online" appeared on production with no Razorpay keys

- **Root cause:** the option rendered unconditionally while production deliberately has no API keys (account activation pending, and test keys must not run on the live site).
- **Fix:** one availability gate used by the page and both server actions; production builds additionally require a `rzp_live_` key.
- **Process note:** the first verification script failed because assigning `undefined` to `process.env.X` stores the string `"undefined"`. Delete the variable instead.

### 4.5 False "Orphaned Payment" alert for a payment that had an order

- **Cause (proven by the alert existing):** `payment.captured` can arrive before the checkout action inserts the order, so the webhook found no order and alerted.
- **Fix:** a grace window. The handler returns 200 at once and a background task re-checks every 5 seconds for about 40 seconds before alerting. The alert text tells admins to check first.
- **Verified:** a signed fake event with no order produced exactly one alert about 45 seconds later; a real paid order produced none.
- **Limits:** the window is a heuristic. A slower upload could still alert.

### 4.6 Alert email arrived late

- **Observation:** the first false alert arrived about two minutes after the order email.
- **Hypothesis (not proven):** the email send was not awaited, and on serverless an unawaited promise can be paused after the response returns. Logs from that run had expired, so this could not be confirmed.
- **Fix regardless:** awaited sends, and background work through `after()`. The grace-window test showed such work completing well after the response.

### 4.7 An online payment was not tied to the order it paid for

- **Found in review, not by a user report:** checkout verified only Razorpay's signature.
- **Root cause:** the signature proves that an order ID and payment ID are a genuine pair. It does not prove the amount equals the cart, nor that the payment has not been used before. Someone could pay for a small cart, fill the cart with more items, and submit the same payment, getting a larger order marked as paid; the same payment could also back several orders.
- **Fix:** the server asks Razorpay for the payment and its order and requires captured status, the matching Razorpay order, INR, the exact cart total in paise, and the same user. Unique indexes on the payment and order IDs allow one order per payment. The signature is compared in constant time.
- **Verified:** a duplicate insert was refused with `23505`. A normal paid order still worked end to end. A payment made after the cart changed was refused with no order created.
- **Lesson:** verifying that a message is authentic is not the same as verifying that it means what the order needs. Check the amount and the one-time use.

### 4.8 A refunded payment still reports `captured: true`

- **Observed against Razorpay's API:** a fully refunded test payment returned `status: refunded` while `captured` stayed `true`. Amounts come back as numbers in paise.
- **Consequence:** verification must check `status`, not just the boolean. A refunded payment then fails the "captured" requirement.

### 4.9 A customer whose cart changed while paying was charged and shown internal numbers

- **First behavior:** the order was refused with a message containing the expected and paid amounts, and the payment stayed captured until an admin refunded it.
- **Fix:** customer-facing errors are now fixed, friendly sentences with no amounts or exception text (details go to server logs). When the payment is genuine, belongs to the caller's own Razorpay order, and only the amount differs, it is refunded in full automatically. Refunds are never attempted when the payment's order, currency or owner does not match.
- **Verified:** the friendly message appeared, Razorpay showed the payment refunded, and no order was created.

### 4.10 The orphan alert still fired after an automatic refund

- **Observation:** after the automatic refund was added, an orphaned-payment alert still arrived for the refunded payment.
- **Root cause:** the first suppression asked the Razorpay API whether the payment was refunded, but the webhook runs on **production**, which deliberately has no API keys. The check always failed and fell back to alerting. This was a mistake in the test plan too: the expectation of "no alert" ignored where the code runs.
- **Fix:** each successful automatic refund is recorded in the `auto_refunds` table, and the webhook consults that table, which needs no API access. A failure to read it still falls toward alerting.
- **Verified:** the ledger row was written, no alert arrived for two minutes, and a fake orphan with no ledger row still alerted about 45 seconds later.
- **Lesson:** design checks around what the running environment actually has.

---

## 5. Email

- **Email links must not point at localhost.** A mail provider flagged localhost links. `NEXT_PUBLIC_SITE_URL` must be the production URL in Vercel and is inlined at build time, so it needs a redeploy.
- **Not delivered is not always a bug.** One order-fulfilled email showed "Sent" but not "Delivered" once; the next send delivered.

### 5.3 User-typed text was placed into HTML emails unescaped

- **Found in review:** names, rejection reasons and similar text were interpolated directly into email HTML, so a crafted value would render as markup in mail sent from `team@florus.in`, including to the admins.
- **Fix:** every typed value in an HTML body is HTML-escaped; line breaks are stripped from user-supplied parts of subjects. Self-built URLs, colour constants and formatted numbers are left alone.
- **Verified:** hostile input produced no live markup in four templates, and a subject with an injected line break came out as one line. A real application named `<b>Test</b> & Co` showed literally in the admin email and the admin page.

---

## 6. Tooling and process

### 6.1 Scripts run with `tsx` do not load `.env.local`

`tsx` does not auto-load it. Because static imports are hoisted, `dotenv.config()` must run before the module that reads the environment is imported (or the import must be dynamic):

```typescript
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });
import { createAdminClient } from '../src/utils/supabase/admin'; // after config()
```

### 6.2 Supabase CLI interactive commands and coding-agent terminals

`db push`, `migration new` and `login` prompt interactively and often appear hung in an agent's terminal. One `migration new` ran twice and created two migration files. Run interactive CLI commands in a real terminal, then confirm exactly one migration file exists per change.

### 6.3 `supabase db query` and `db execute` target local Docker

They cannot reach the hosted database. Run verification SQL in the Supabase SQL editor.

### 6.4 Windows PowerShell

`&&` is not a valid separator; run commands separately. Paths with `[brackets]` need `-LiteralPath`. `Invoke-WebRequest` prompts about script parsing unless `-UseBasicParsing` is used.

### 6.5 Vercel Hobby limits that shaped the design

- Runtime logs are retained only briefly, so production tests must be read promptly.
- Firewall custom rules are capped, with one rate-limit rule per project, per-IP counting per region and no IP bypass. See ARCHITECTURE section 12.
- Background work after a response must use `after()` (with a `maxDuration` the plan allows), not an un-awaited promise.

### 6.6 Process lessons from working with an AI coding agent

- **Claims need evidence.** "Build passed" and "should work" are not verification. Evidence is terminal output, database rows, a diff, or an executed test.
- **Watch for downgraded tests,** such as "will verify in the browser" next to a checked box.
- **Do not let the agent write documentation.** It fabricated plausible progress entries twice (one was committed and then reverted), and later edited a documentation file again against explicit instructions. Documentation is written by hand from verified facts; the standing rules are in `AGENTS.md`.
- **Separate proven facts from guesses.** "Transient Razorpay issue" and "possibly rate limiting" were guesses stated as facts. Write "cause unknown" when it is.
- **Review every diff before committing,** confirm `.env.local` never appears, and confirm the pushed commit with `git log --oneline -3`. Check `git status` too, because an unrequested file can slip in.
- **Never print a secret.** Any credential that appears in chat, logs or terminal output you do not control is compromised; rotate it. (This happened once with a generated admin password.) Secrets go to `.env.local` or the host's settings directly.
- **Verify live facts about external services** (Razorpay, Vercel, Supabase) from their documentation before depending on them, and say what was and was not verified.
- **A review by reading is not a test.** Several real bugs (cart editing, the missing grant, the production-only alert behavior) were only found by running the flow in the environment where it matters.
