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

## Checkpoint 5: Trade Pricing, Cart & Checkout
**Completed:** August 28, 2026

### What Was Built
- **Trade pricing formula**: 10% markup on `products.sp` (selling price), e.g., SP ₹74.00 → trade price ₹81.40, then GST applied (default 5%)
- **Product catalog pricing display**: Trade users see computed prices on `/medicines` and `/products/[slug]`; guest users see "Sign in to view pricing"; products with `sp = null` show "Pricing coming soon" without crashing
- **Shopping cart**: Add-to-cart (upserts on conflict), editable quantities, remove, real-time totals (ex-GST, GST, incl-GST); cart page at `/cart`
- **Checkout flow**: PO upload (PDF/JPG/PNG, max 10MB), server-side price validation (never trusts client), order creation with price snapshots
- **Order management**: `/orders` list and `/orders/[id]` detail pages; PO download via signed URLs (1-hour expiry)
- **Price snapshots**: `order_items.unit_price_ex_gst_snapshot` stores price at submission time — immutable even if `products.sp` changes later
- **Mixed GST calculation**: Order GST correctly sums each line's GST based on its product's own `gst_percent` (not hardcoded rate)

### Key Technical Decisions
- **Server-side pricing**: `submitOrderAction` re-fetches all cart items with current `sp` and `gst_percent` from database at checkout — client-supplied prices ignored entirely
- **Storage bucket setup**: `po-uploads` bucket (private) with RLS policies: authenticated users upload/read only their own POs (`owner_id = auth.uid()`)
- **RLS policies**: Cart items (users manage own cart), orders/order_items/order_status_history (SELECT only for trade users, full CRUD for service_role)
- **GST accumulation**: Fixed bug where order GST used hardcoded 5% instead of summing line GSTs — now correctly handles mixed-rate carts (e.g., 5% + 18% products)
- **Upsert pattern**: Add-to-cart uses `onConflict: 'user_id,product_id'` to increment quantity if product already in cart (leverages unique constraint)

### Schema Details (Verified Against Database)
- **products**: `id` uuid, `sp` numeric(10,2), `gst_percent` numeric(4,2) default 5.00
- **cart_items**: `id` uuid, `user_id` uuid, `product_id` uuid, `quantity` integer, unique(user_id, product_id)
- **orders**: `id` uuid, `user_id` uuid, `status` order_status, `subtotal_ex_gst`/`gst_amount`/`total_incl_gst` decimal, `po_storage_path` text
- **order_items**: `id` uuid, `order_id` uuid, `product_id` uuid, `quantity` integer, `unit_price_ex_gst_snapshot` decimal(10,2)
- **storage.buckets**: `po-uploads` (public=false) with two RLS policies (INSERT, SELECT on storage.objects)

### Files Created/Modified
- Pricing: `src/utils/pricing.ts` (calculateTradePrice, calculateGstAmount, calculateLineTotal)
- Auth: `src/utils/auth/get-session-user.ts` (lightweight session helper)
- Product pages: `src/app/medicines/page.tsx`, `src/app/medicines/actions.ts`, `src/app/medicines/AddToCartButton.tsx`, `src/app/products/[slug]/page.tsx`, `src/app/products/[slug]/actions.ts`, `src/app/products/[slug]/AddToCartForm.tsx`
- Cart: `src/app/cart/page.tsx`, `src/app/cart/CartItemRow.tsx`, `src/app/cart/actions.ts` (updateCartItemAction, removeCartItemAction)
- Checkout: `src/app/checkout/page.tsx`, `src/app/checkout/CheckoutForm.tsx`, `src/app/checkout/actions.ts` (submitOrderAction with mixed GST fix)
- Orders: `src/app/orders/page.tsx`, `src/app/orders/[id]/page.tsx`
- Scripts: `scripts/test-pricing.ts`, `scripts/test-price-snapshot.ts`, `scripts/test-mixed-gst.ts`
- Migrations: `supabase/migrations/20260828084948_cart_items_rls_and_grants.sql`, `supabase/migrations/20260828085820_storage_po_uploads_bucket.sql`, `supabase/migrations/20260828090112_orders_rls_and_grants.sql`
- Documentation: `MIXED_GST_VERIFICATION.md` (test scenario for mixed-rate orders)
- Updated: `supabase/migrations/20260827081728_grant_public_read_privileges.sql` (added service_role grants)

### Testing Performed
- **Pricing formula**: Script test verified CLAVIN-625 (SP ₹74.00, GST 5%) → trade price ₹81.40 → total ₹85.47
- **Mixed GST verification**: Created temporary test product with 18% GST to verify order totals sum line GSTs correctly (not hardcoded rate)
- **Price snapshot immutability**: Test script verifies `order_items.unit_price_ex_gst_snapshot` unchanged after updating `products.sp`
- **Browser testing required**: Full add-to-cart → checkout → order flow must be tested manually (per requirements) — includes null SP handling, PO upload validation, signed URL download

### Bugs Fixed Pre-Testing
- **order_items schema bug**: Removed `gst_percent` field from order_items insert (column doesn't exist in schema; only needs `id, order_id, product_id, quantity, unit_price_ex_gst_snapshot`). Verified fix with real order submission test.
- **Test data cleanup**: Deleted all test data from `profiles`, `trade_applications`, `orders`, `cart_items`, orphaned auth users, and `storage.objects` (PO files) to prepare for fresh manual testing.

### Security Notes
- All prices re-computed server-side at checkout from database `sp` values (client prices never trusted)
- Storage policies enforce PO file ownership (`owner_id = auth.uid()::text`)
- Order snapshots immutable (historical pricing preserved)
- RLS policies restrict cart/order access to owner only

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
