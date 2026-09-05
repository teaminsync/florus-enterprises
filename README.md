# Florus Enterprises — Wholesale Ordering Platform

Florus Enterprises is a pharmaceutical medicine stockist and dealership. This
repository is a public-facing catalog and gated trade-ordering platform:
anyone can browse the medicine catalog at MRP, but placing an order requires
a Florus-approved trade account (doctor, pharmacy, retailer, or hospital).

Florus holds a Drug Licence (DL) authorizing sale to retailers/chemists,
hospitals/institutions, and registered allopathic doctors — **not** a retail
licence, so this platform does not and cannot sell directly to patients.

## Tech Stack

- **Next.js 16.3** (App Router, Turbopack)
- **TypeScript**
- **Tailwind CSS**
- **Supabase** — Postgres (database), Auth, and Storage (private PO-file
  uploads), hosted (project ref `elwqbhuaycalotcgxbjh`)

See `ARCHITECTURE.md` for how these fit together, and `TROUBLESHOOTING.md`
for real issues hit during development and how they were resolved.

## Prerequisites

- Node.js 22+ and npm
- A Supabase account with access to the `elwqbhuaycalotcgxbjh` project (or
  your own project, if standing this up fresh — see note below)
- Supabase CLI (installed as a project dev dependency; no separate global
  install needed)

## Environment Variables

Create `.env.local` in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=https://elwqbhuaycalotcgxbjh.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Get the first three from Supabase Dashboard → Settings → API Keys (this
project uses the current `sb_publishable_...` / `sb_secret_...` key format,
**not** the legacy `anon` / `service_role` JWTs — scripts and helpers in
this codebase read `SUPABASE_SECRET_KEY` specifically; there is no fallback
to a differently-named variable).

`NEXT_PUBLIC_SITE_URL` is used to build absolute links (e.g. the trade
invite link an admin relays manually — see below) and should be updated
if this is ever deployed somewhere other than localhost.

**Never commit `.env.local`.** It's already covered by `.gitignore`'s
`.env*` pattern — double-check this hasn't changed before any commit.

## First-Time Setup

```bash
npm install
npx supabase login          # opens a browser to authenticate
npx supabase link --project-ref elwqbhuaycalotcgxbjh
npx supabase db push        # applies every migration in supabase/migrations/, in order
npx tsx scripts/seed-admin.ts
npm run dev
```

`seed-admin.ts` creates the first admin account (`admin@florus.in` by
default — edit the script if you want a different address) and prints a
generated password **once**, to the terminal only. Save it immediately and
change it after first login; it will not be shown again. The script is
idempotent — safe to re-run if you're unsure whether the account already
exists (it detects and reports either case correctly, without silently
doing nothing the way an earlier version of it once did — see
`TROUBLESHOOTING.md`).

The app runs at `http://localhost:3000`.

## Manual Step: Trade Account Invitations

This project does **not** send real invitation emails. Supabase's default
email sender requires custom SMTP to unlock template editing, and the
default `inviteUserByEmail` flow is incompatible with this project's auth
setup (see `TROUBLESHOOTING.md` for why). Instead:

1. A trade applicant registers at `/trade/register`.
2. An admin reviews and approves the application at `/admin/applications`.
3. On approval, the system generates a real, working invite link and
   displays it directly in the admin UI (`/admin/applications/[id]`).
4. **The admin must copy this link and send it to the applicant themselves**
   — by email, phone, or whatever channel Florus already uses to verify
   applicants. This is a deliberate design choice, not a missing feature —
   see `ARCHITECTURE.md`.

If real transactional email becomes a priority later, the correct path is
configuring custom SMTP in Supabase and switching the approval flow back to
`inviteUserByEmail` with a corrected email template (both are documented as
a live option, not implemented here).

## Key Routes

**Public** (no login): `/`, `/about`, `/contact`, `/medicines`,
`/products/[slug]`

**Trade** (requires an approved trade account): `/trade/login`,
`/trade/register`, `/trade/dashboard`, `/cart`, `/checkout`, `/orders`,
`/orders/[id]`

**Admin** (requires an admin account): `/admin`, `/admin/applications`,
`/admin/applications/[id]`, `/admin/orders`, `/admin/orders/[id]`

## Scripts

- `scripts/seed-admin.ts` — creates/verifies the admin account. Reusable,
  idempotent, safe to run any time.
- `scripts/reset-test-data.ts` — wipes trade profiles, applications, orders,
  cart items, orphaned auth users, and PO storage files, while preserving
  admin accounts, products, and categories. Use before a fresh manual
  testing pass. **Destructive** — do not run against real customer data.

Both are the only scripts that should exist in `scripts/` on an ongoing
basis. Any other script that shows up there is a one-off verification
artifact that should have been deleted after its job was done — see the
script-hygiene rule in `AGENTS.md`.

## Known Open Items

- **One product has a missing SAP code.** The Axera Trion source price list
  lists two different products ("TELMICLAR AM TAB 40/5MG,15'S" and
  "TELMICLAR TAB 40MG,15'S") under the same SAP code (5602597) — a genuine
  error in the source document, not an import bug. "TELMICLAR TAB 40MG,15'S"
  was imported with `sap_code = NULL` rather than a guessed value. Florus
  needs to supply the correct, distinct SAP code for this product.
- **No real email delivery** — see "Manual Step" above.
- **Design is functionally complete but not final-polished** for a launch
  — see `PROGRESS.md`'s Checkpoint 8 entry for what was and wasn't covered
  in the design consistency pass, and use your own browser judgment for
  anything further.

## Deployment

This project has been built and verified entirely against a local dev
server connected to a hosted Supabase project. No production deployment
target (Vercel or otherwise) has been configured yet — that's a deliberate
next step, not an oversight, and should get its own dedicated setup pass
(environment variables, `NEXT_PUBLIC_SITE_URL` update, and a decision on
whether to keep using this same Supabase project or provision a separate
production one).
