-- Tables created via raw SQL migrations don't automatically receive the
-- default anon/authenticated GRANTs that Supabase's Studio table editor
-- applies for you. RLS policies alone are not sufficient — Postgres checks
-- table-level GRANTs before it ever evaluates an RLS policy. This migration
-- grants exactly the same scope our RLS policies already describe:
-- categories fully public-readable, products readable for active rows only.
-- (RLS still restricts which rows are visible; this grant only unlocks
-- SELECT at the table level.)

grant usage on schema public to anon, authenticated;
grant select on public.categories to anon, authenticated;
grant select on public.products to anon, authenticated;

-- service_role needs full access for admin operations and testing scripts
grant select, insert, update, delete on public.products to service_role;
grant select, insert, update, delete on public.categories to service_role;
