# Florus Enterprises — Development Progress

This document tracks completed work across project checkpoints.

---

## Checkpoint 4: Auth, Trade Registration & Admin Approval
**Completed:** August 28, 2026

### What Was Built
- **Authentication flows**: Email confirmation handler supporting PKCE and implicit flow tokens, auth error page, password-setting flow for invited users
- **Trade registration**: Public registration form with type-specific fields (doctor/pharmacy/retailer/hospital), server-side application submission using admin client
- **Admin approval system**: Dashboard showing pending application count, applications list with filtering, detailed application view with approve/reject actions
- **Invite link generation**: Server-side `generateLink` approach (replaces email-based `inviteUserByEmail`) — admin receives invite URL to relay manually, fitting Florus's existing phone-verification workflow
- **Authorization**: `requireRole` helper for server-side role verification (never trusts client-supplied role), role-based redirects after login
- **RLS policies**: `profiles` table readable by authenticated users only, `trade_applications` locked to service_role (admin client) with no public/anon policies
- **Admin seeding**: Idempotent script that creates admin user + profile, safe to run repeatedly

### Key Technical Decisions
- **generateLink over inviteUserByEmail**: Supabase Dashboard's email template editor is locked without custom SMTP. Rather than configure SMTP mid-checkpoint, switched to server-side link generation. Admin copies and relays the link manually (natural extension of existing phone-verification process, not a workaround).
- **Admin client pattern**: Separate `createAdminClient()` using `SUPABASE_SECRET_KEY` for all trade_applications operations (bypasses RLS). Cleaner and more secure than granting public insert/update.
- **Shared login form**: Single `/trade/login` endpoint for both admin and trade users, with server-side role-based redirect after authentication.

### Security Notes
- Invite token briefly visible in admin UI (copyable text box on approval success page). Acceptable tradeoff for internal admin tool used by trusted staff, but flagged explicitly as a design choice, not an oversight.
- No browser-based form submission testing performed — `/trade/register` form and end-to-end invite flow require manual testing in actual browser session.

### Files Modified/Created
- Auth: `src/app/auth/confirm/route.ts`, `src/app/auth/error/page.tsx`
- Trade registration: `src/app/trade/register/page.tsx`, `src/app/trade/register/actions.ts`, `src/app/trade/register/success/page.tsx`
- Trade login/dashboard: `src/app/trade/login/page.tsx`, `src/app/trade/login/actions.ts`, `src/app/trade/dashboard/page.tsx`, `src/app/trade/dashboard/actions.ts`
- Set password: `src/app/trade/set-password/page.tsx`, `src/app/trade/set-password/actions.ts`
- Admin: `src/app/admin/page.tsx`, `src/app/admin/applications/page.tsx`, `src/app/admin/applications/[id]/page.tsx`, `src/app/admin/applications/[id]/actions.ts`, `src/app/admin/applications/[id]/ApproveButton.tsx`
- Utils: `src/utils/supabase/admin.ts`, `src/utils/auth/require-role.ts`
- Scripts: `scripts/seed-admin.ts`, `scripts/test-approve-flow.ts`
- Migrations: `supabase/migrations/20260827114504_auth_rls_and_grants.sql`, `supabase/migrations/20260827115111_grant_service_role_profiles_insert.sql`, `supabase/migrations/20260828023509_grant_service_role_profiles_select.sql`
- Env: `.env.local` (added `NEXT_PUBLIC_SITE_URL`)

### Testing Performed
- Seed script: Ran twice in succession, verified idempotency (second run correctly detected existing user + profile, no errors)
- Approve flow: Script-driven test confirmed all four outcomes (auth user created, profile created with role=trade, application status updated to approved, invite URL returned with valid token_hash)
- Page load: Admin application detail page (`/admin/applications/[id]`) rendered successfully (HTTP 200)
- **Not tested**: Actual browser-based form submission via `/trade/register`, full invite link click-through, or real email delivery (out of scope for automated testing)

---

## Checkpoint 3: Product Catalog & Public Pages
**Completed:** August 27, 2026

- Products table with categories, pricing, search, stock management
- Medicines catalog page with search and filtering
- Individual product detail pages
- Public-facing About and Contact pages
- RLS policies granting anonymous read access to catalog tables

---

## Checkpoint 2: Initial Database Schema
**Completed:** August 27, 2026

- Core tables: products, categories, cart, orders, profiles, trade_applications
- RLS enabled on all tables
- Base authentication scaffolding

---

## Checkpoint 1: Next.js Project Setup
**Completed:** August 27, 2026

- Next.js 15 with App Router
- TypeScript, Tailwind CSS
- Supabase client integration
- Project structure and configuration
