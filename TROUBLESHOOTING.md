# Troubleshooting — Florus Enterprises

Real bugs hit during development, their actual root causes (not just the
symptom), and how they were fixed or worked around. Written so the same
mistake isn't repeated, and so a fix is applied at the real cause rather
than papered over at the symptom.

---

## 1. `permission denied for table X` despite a correct, enabled RLS policy

**Symptom**: A table had RLS enabled and a policy that should have
permitted the query (confirmed correct by reading it), but queries from
the browser/anon or authenticated client still failed with
`permission denied for table X`.

**Root cause**: Postgres checks two independent things before a query
succeeds — a table-level `GRANT` for the requesting role, and (only if
that passes) whatever RLS policies apply. Supabase's dashboard/Studio
table editor applies default `GRANT SELECT/INSERT/UPDATE/DELETE` to the
`anon` and `authenticated` roles automatically whenever a table is created
through it. **Tables created via the Supabase CLI migration workflow do
not get this automatic grant.** Every table in this project was created
via CLI migrations, so this gap applied everywhere by default.

This was hit independently at least three times before the pattern was
understood: `products`/`categories` (public catalog access, Checkpoint 3),
`profiles` (Checkpoint 4, twice — once for `SELECT`, once for the
`service_role`'s own `INSERT`/`SELECT` needed by the admin seed script),
and pre-emptively addressed for `cart_items`/`orders`/`order_items`/
`order_status_history`/`storage.objects` once the pattern was known
(Checkpoint 5).

**Fix**: Every RLS policy must be paired with an explicit `GRANT`
migration for the same table/role combination. Verify both independently
— `select * from pg_policies where tablename = 'x'` proves the policy
exists; `select grantee, privilege_type from
information_schema.role_table_grants where table_schema = 'public' and
table_name = 'x'` proves the grant exists. Checking only the policy is
not sufficient evidence that access actually works.

---

## 2. Invite email link never establishes a session

**Symptom**: Using `supabase.auth.admin.inviteUserByEmail()` for trade
account approval would (if it were fully wired up) send an email whose
link, when clicked, would not log the user in.

**Root cause**: Supabase's default invite email delivers tokens using the
**implicit flow** — `access_token` etc. appended to the URL as a hash
fragment (`#access_token=...`), which never reaches the server (hash
fragments are client-only). `@supabase/ssr`'s `createBrowserClient`
defaults to the **PKCE flow**, which expects a `?code=` query parameter
instead. These are fundamentally incompatible; the link would silently
fail to set a session.

**Fix**: Use `supabase.auth.admin.generateLink({ type: 'invite', email })`
instead — it returns a `hashed_token` directly to server code rather than
sending an email. Build a confirmation URL as
`{SITE_URL}/auth/confirm?token_hash=...&type=invite&next=...` and handle
it with a route handler that calls `supabase.auth.verifyOtp({ type,
token_hash })` via the cookie-based server client, which sets the session
through cookies server-side — no hash-fragment parsing, no flow mismatch.
Since this project doesn't have custom SMTP configured (Supabase's default
email sender locks template editing without it), the resulting link is
shown directly to the admin to relay manually rather than emailed — see
`ARCHITECTURE.md`.

---

## 3. `order_items` insert fails — `gst_percent` column doesn't exist

**Symptom**: The very first real order submission would have failed with
a "column does not exist" error (caught before it ever reached a real
user, during a deliberate audit against the actual schema).

**Root cause**: The checkout Server Action's order-items insert included
a `gst_percent` field, based on an assumption about the schema that was
never actually checked against the real migration. `order_items` has no
such column — only `id, order_id, product_id, quantity,
unit_price_ex_gst_snapshot`. This went undetected for an entire
development session because every verification up to that point was
either a standalone pricing-calculation script or arithmetic reasoning —
never an actual database insert.

**Fix**: Removed the field. Confirmed by creating a real order end-to-end
and inspecting the real returned `order_items` row.

**Lesson**: A calculation being logically correct and a database insert
succeeding are different claims. Neither should be accepted as evidence
for the other.

---

## 4. Admin order pages crash — `profiles.email` doesn't exist

**Symptom**: Same failure class as #3, same root cause pattern
(unverified schema assumption), different table. `/admin/orders` and
`/admin/orders/[id]` both selected `email` from a `profiles` join.

**Root cause**: `profiles` has no `email` column — email lives only on
Supabase's `auth.users`, which was never duplicated into `profiles` by
design (see `ARCHITECTURE.md`). This also went undetected until a real
query was run against the real schema, not just read from the code.

**Fix**: Fetch email separately via `adminClient.auth.admin.getUserById
(order.user_id)` rather than joining it from `profiles`.

---

## 5. Order-level GST silently hardcoded at 5%

**Symptom**: None visible during normal testing — every real seeded
product happens to carry `gst_percent = 5.00`, so a hardcoded `5%`
calculation and the "sum each line's real GST" calculation produced
identical numbers.

**Root cause**: `submitOrderAction` computed the order's total
`gst_amount` as `subtotalExGst × 0.05`, discarding a per-line GST value
it had already correctly computed earlier in the same function using each
product's own `gst_percent`. Because every product in the seeded data
shares the same rate, this bug was invisible to any test that didn't
deliberately introduce a product with a different rate.

**Fix**: Accumulate the real per-line GST values (already computed
correctly) into a running total instead of recomputing from a fixed rate.
Verified by temporarily adding a test product at 18% GST alongside a real
5% product, submitting a real order, and confirming the stored
`gst_amount` matched the true sum, not a 5%-of-everything calculation.

**Lesson**: A bug that only manifests with input data the current dataset
doesn't happen to contain is still a real bug — test with a deliberately
different case, not just the happy path the current data provides.

---

## 6. `TELMICLAR AM` / `TELMICLAR TAB` share one SAP code

**Symptom**: The Axera Trion source price list lists two genuinely
different products — "TELMICLAR AM TAB 40/5MG,15'S" and "TELMICLAR TAB
40MG,15'S" — both under SAP code `5602597`.

**Root cause**: This is an error in Florus's own source document, not a
transcription or import bug. `products.sap_code` has a `UNIQUE`
constraint, so both rows cannot share the code.

**Fix**: "TELMICLAR TAB 40MG,15'S" was imported with `sap_code = NULL`
rather than inventing a plausible-looking but fabricated code. This is
flagged in the full-catalog-import migration's own comments and in
`README.md`'s "Known Open Items" — Florus needs to supply the correct,
distinct SAP code.

---

## 7. `tsx` scripts silently fail to read `.env.local`

**Symptom**: One-off verification scripts run via `npx tsx scripts/
whatever.ts` would fail with "missing environment variable" even though
`.env.local` clearly had the value.

**Root cause**: `tsx` does not auto-load `.env.local` the way `next dev`
does. Scripts that import anything reading `process.env` (like
`createAdminClient()`) need `dotenv` loaded explicitly, and — because of
ES module import hoisting, static imports execute before any other
top-level code in the same module regardless of source order — the
`dotenv.config()` call must happen via an import that's guaranteed to run
first, or via a dynamic `await import()` after `config()`, not just placed
textually above other imports.

**Fix**: Every ad hoc script starts with:
```typescript
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });
import { createAdminClient } from '../src/utils/supabase/admin'; // after config()
```

---

## 8. Supabase CLI interactive output doesn't reliably stream back through the coding agent

**Symptom**: Commands like `npx supabase db push`, `npx supabase
migration new`, and `npx supabase login` (all of which prompt for
interactive confirmation) would frequently appear to hang or produce no
output when run through the coding agent's terminal tool on Windows, even
though the command had actually completed successfully.

**Root cause**: A terminal-output-capture quirk specific to the
interactive-prompt + Windows PowerShell + coding-agent-tool combination —
not a real failure of the underlying command.

**Fix**: Never assume success or failure from an apparently-hung or
empty tool result for these specific commands. Have a human check the
real terminal window and paste back the actual output before proceeding
either direction.

---

## 9. Deleting a Storage "file" via raw SQL doesn't delete the file

**Symptom**: `delete from storage.objects where ...` appeared to remove a
row but the underlying uploaded file/bytes were not actually gone from
the storage backend, and the Supabase dashboard could still show
inconsistent state afterward.

**Root cause**: `storage.objects` is Postgres's metadata table for
Storage — deleting a row there doesn't invoke Storage's own deletion path
against the actual object bytes in the backend, so raw SQL manipulation
and the real file lifecycle can drift apart.

**Fix**: Always use the Storage API's own methods
(`supabase.storage.from(bucket).remove([paths])`) for anything that needs
to actually delete a file, never raw SQL against `storage.objects`
directly.

---

## 10. Any credential printed to chat/terminal output is burned

**Applies generally, hit concretely at least once**: a generated admin
password appeared in a coding agent's response text (intended only to be
shown to the human in the terminal). Once any real secret has been
printed anywhere outside a private terminal a human controls — even
transiently, even in a tool that's "just for review" — treat it as
compromised and rotate it immediately. Don't reason about whether it was
"probably fine."

---

## 11. Legacy vs. current Supabase API key naming

This project uses Supabase's current key format (`sb_publishable_...` /
`sb_secret_...`), not the legacy `anon` / `service_role` JWTs. The
project's own env var is named `SUPABASE_SECRET_KEY`. Several early
ad hoc scripts assumed the older `SUPABASE_SERVICE_ROLE_KEY` name (copied
from generic examples/muscle memory) and failed until corrected — watch
for this specifically if writing any new script from scratch rather than
copying `scripts/seed-admin.ts`'s existing, correct pattern.

---

## 12. GRPPL Critical Care Franchisee sheet is 100% duplicate data

Not a bug, but worth recording so nobody re-imports it later or wonders
why it's absent: every SAP code on Florus's "GRPPL Critical Care
Franchisee" price sheet (4 products) is a verbatim duplicate of a row
already present on the separate "GRPPL Franchisee" sheet. It contributed
zero new products to the catalog import — confirmed by cross-checking SAP
codes across both documents before writing the import.
