# Florus Enterprises — Wholesale Ordering Platform

> **Proprietary software.** Developed by InSync for Florus Enterprises. All rights reserved. Unauthorized copying or distribution is prohibited.

Florus Enterprises is a licensed pharmaceutical stockist and distributor based in Virar West, Maharashtra. This repository contains its website and wholesale ordering platform.

Anyone can browse the catalog at MRP. Placing an order requires a Florus-approved **trade account** (doctor, pharmacy, retailer or hospital). Florus holds a Drug Licence for wholesale supply to retailers and chemists, hospitals and institutions, and registered doctors. It has no retail licence, so the platform never sells directly to patients.

Production site: <https://www.florus.in>

## At a glance

| Area | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| Styling | Tailwind CSS 4, Inter font, no component library |
| Database, auth, files | Supabase: Postgres, Auth (`@supabase/ssr`, PKCE), private Storage bucket `po-uploads` |
| Transactional email | Resend (verified domain `florus.in`) |
| Online payments | Razorpay (test mode today; live mode pending account activation) |
| Contact form storage | Google Apps Script web app writing to a Google Sheet |
| Hosting | Vercel (Hobby plan), custom domain `www.florus.in` |

How the pieces fit together is described in [ARCHITECTURE.md](ARCHITECTURE.md). Past problems and their root causes are in [TROUBLESHOOTING.md](TROUBLESHOOTING.md). The dated build log is [PROGRESS.md](PROGRESS.md).

## Quick start

Prerequisites: a current Node.js LTS with npm (a `package-lock.json` is committed), a Supabase project, a Resend account with a verified sending domain, a Razorpay account (test mode is enough for development), and a deployed Google Apps Script web app for the contact form.

```bash
npm install
# create .env.local (see "Environment variables" below)
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push          # applies every migration in supabase/migrations/, in order
npx tsx scripts/seed-admin.ts # creates the admin account and prints its password once
npm run dev                   # http://localhost:3000
```

`seed-admin.ts` creates `admin@florus.in` with a random password that is printed **once** to the terminal. Save it immediately. The script is idempotent and safe to re-run.

### Database bootstrap caveat

The database was built up incrementally: categories were seeded early from `supabase/seed.sql`, and the 228-product catalog was imported later by a migration. That migration looks up category IDs, so on a **brand-new** database `db push` stops at the catalog import because the categories do not exist yet. `db push` does not run `seed.sql`, and running all of `seed.sql` is wrong anyway because its sample products would collide with the import.

Expected workaround for a new database (not yet exercised end to end): run `db push`, let it stop at `20260902060354_full_catalog_import.sql`, execute only the `categories` insert from `supabase/seed.sql` in the Supabase SQL editor, then run `db push` again. Moving category seeding into a migration would remove this caveat.

## Environment variables

Create `.env.local` in the project root. It is gitignored (`.env*`) and must never be committed. The repository is public.

| Variable | Purpose | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Public by design |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser/server client key | `sb_publishable_...` format |
| `SUPABASE_SECRET_KEY` | Service-role client, bypasses RLS | `sb_secret_...` format. Server only. The name is exact; there is no fallback to `SUPABASE_SERVICE_ROLE_KEY` |
| `NEXT_PUBLIC_SITE_URL` | Absolute links in emails and invite URLs | No trailing slash. Inlined at build time, so changing it needs a redeploy |
| `RESEND_API_KEY` | Sends all transactional email | The email module throws at import if missing |
| `GOOGLE_APPS_SCRIPT_CONTACT_URL` | Contact-form endpoint | Treat as a write credential |
| `RAZORPAY_KEY_ID` | Razorpay API key ID | Together with the next two, enables online payment (see below) |
| `RAZORPAY_KEY_SECRET` | Razorpay API secret | Used to create orders, refund, and verify checkout signatures |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook signature secret | A different secret from the API secret. Test and live webhooks have different secrets |

Online payment is offered only when all three Razorpay variables are present. In a production build the key ID must also start with `rzp_live_`, so test keys can never enable it on the live site. Production therefore has no Razorpay API keys until the account is live. It holds only the test webhook secret, which the webhook route needs to verify events.

**Local development and production currently share one Supabase project.** Orders created locally are real rows in the production database. A webhook event for a locally created payment is processed by the production endpoint.

## Scripts

| Script | Use |
| --- | --- |
| `npm run dev` / `build` / `start` / `lint` | Standard Next.js commands |
| `scripts/seed-admin.ts` | Creates or verifies the single admin account. Reusable, idempotent |
| `scripts/reset-test-data.ts` | Clears test activity. **Destructive** |

`reset-test-data.ts` deletes all carts, all orders (with items and history), all uploaded PO files, and every trade account except the admin and four demo accounts (doctor, hospital, pharmacy, retailer). Their IDs are hardcoded at the top of the script and belong to the current Supabase project; edit them before using the script against any other database. Because local and production share a project, running it affects production data. Known gap: it does not delete applications that have no linked profile (pending or rejected ones), because its filter skips null values; delete those rows in the Supabase SQL editor until the script is fixed. Its "Deleted N" lines are also unreliable, so trust the verification counts at the end.

Any other script in `scripts/` is a one-off that should have been deleted after use.

## Repository layout

```
src/
  app/                  routes (App Router); each route folder holds its page, client components and server actions
    admin/              applications queue, order review
    api/webhooks/razorpay/   Razorpay webhook handler
    auth/               confirm (token verification route) and error page
    cart/ checkout/ orders/  trade ordering flow
    trade/              login, register, dashboard, set-password, forgot-password
    medicines/ products/[slug]/  public catalog
    about/ contact/     marketing pages
  components/           Header, Footer
  utils/
    auth/               requireRole, requireTradeAccountReady, getSessionUser, getAuthHomeRoute
    email/              Resend client, sendEmail, templates, ADMIN_EMAILS
    orders/             state machine (transitions), calculateCartTotal
    razorpay/           SDK client, isOnlinePaymentEnabled
    supabase/           browser, server, middleware and admin clients
    trade/              registration detail lookup
    pricing.ts          trade price and GST math
scripts/                seed-admin.ts, reset-test-data.ts
supabase/migrations/    every schema change, in order, as plain SQL
public/                 logo, favicons, web manifest
```

## Routes

| Access | Routes |
| --- | --- |
| Public | `/`, `/about`, `/contact`, `/medicines`, `/products/[slug]` |
| Sign-in and onboarding | `/trade/login`, `/trade/register`, `/trade/register/success`, `/trade/forgot-password`, `/trade/set-password`, `/auth/confirm`, `/auth/error` |
| Trade account | `/trade/dashboard`, `/cart`, `/checkout`, `/orders`, `/orders/[id]` |
| Admin | `/admin`, `/admin/applications`, `/admin/applications/[id]`, `/admin/orders`, `/admin/orders/[id]` |
| API | `/api/webhooks/razorpay` (signature-verified) |

## Day-to-day operations

- **New trade application.** Admins get an email. Review it at `/admin/applications`. Approving creates the account and emails the applicant a password-setup link; the same link is shown to the admin for manual relay. Rejecting requires a reason, which is emailed to the applicant.
- **New order.** Admins get an email. Review the order and its uploaded purchase order at `/admin/orders`. Approve, send back for revision, or reject. Approved orders are later marked fulfilled.
- **Rejecting a paid-online order** refunds the full amount automatically. The order page shows the payment status (`refund_initiated`, then `refunded` once Razorpay confirms by webhook).
- **Alert emails** go to the addresses in `ADMIN_EMAILS` (`src/utils/email/admin-recipients.ts`):
  - *Refund Failed*: the order was rejected but the refund did not go through. Refund the payment manually in the Razorpay Dashboard. The webhook matches refunds by payment ID, so the order should update itself; verify on the order page.
  - *Orphaned Payment*: sent only if a captured payment still has no order 40 seconds later. First search `/admin/orders` for the payment ID. If there is truly no order, contact the customer and either create the order manually or refund in the Razorpay Dashboard. The same alert follows when checkout refuses a payment because it does not match the order (for example, the cart changed while the customer was paying): that customer has been charged and needs a refund.
- **Customer detail changes.** Trade users cannot edit their registration details. They are asked to email `team@florus.in`.

## Deployment

The site deploys from `main` on Vercel. Vercel Hobby cannot build private organization repositories, which is why the repository is public.

1. Set the environment variables above for the **Production** environment. A new deployment is required for any change to take effect.
2. Domain: `www.florus.in` is canonical; `florus.in` redirects to it.
3. Razorpay webhook: register `https://www.florus.in/api/webhooks/razorpay` for `payment.captured`, `refund.processed` and `refund.failed`, with its own secret stored as `RAZORPAY_WEBHOOK_SECRET`.
4. Vercel Hobby runtime logs are retained only briefly, and the Razorpay test dashboard shows no delivery history, so check logs promptly after any production test.

### Going live with online payments

Online payment stays hidden until every step below is done.

1. Razorpay account activation (KYC) approved, including the settlement-account issue flagged in test mode.
2. Generate live API keys.
3. Register a **live-mode** webhook for the same URL and events. It has its own secret.
4. In Vercel Production set `RAZORPAY_KEY_ID` (`rzp_live_...`), `RAZORPAY_KEY_SECRET`, and replace `RAZORPAY_WEBHOOK_SECRET` with the live secret. Redeploy.
5. Complete the items under "Planned before go-live" in [PROGRESS.md](PROGRESS.md). Remove or secure the demo trade accounts and clear test orders (`reset-test-data.ts` preserves the demo set, so delete those accounts separately), because local development and production share one database.
6. Make a small real payment, reject the order, and confirm the refund and the `refunded` status. Confirm alert emails reach every address in `ADMIN_EMAILS`.

## Known open items

- **TELMICLAR TAB 40MG,15'S has no SAP code.** The source price list gave it the same code as another product. Florus must supply the correct one.
- **Razorpay settlement is paused** in test mode pending account activation.
- **One unexplained refund failure** (Razorpay returned `BAD_REQUEST_ERROR` once, the identical retry succeeded). Monitor; escalate to Razorpay support if it recurs.
- **`ADMIN_EMAILS` is hardcoded** in source rather than configured by environment.
- **Next.js `middleware` file convention is deprecated** in favor of `proxy`; the build warns and no migration has been done.
- **Content not yet supplied by Florus** and therefore not published: typical approval time for trade applications, minimum order value, order-to-delivery timeline, order status update channel.

## License

Proprietary. Developed by InSync for Florus Enterprises. All rights reserved. No license is granted to copy, modify, distribute or use this code without written permission from the rights holder.
