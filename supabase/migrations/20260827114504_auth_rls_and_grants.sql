-- RLS policies and grants for auth-related tables

-- profiles: a user may read their own row. No public/anon access needed —
-- profiles are only ever created server-side via the secret-key client.
create policy "users can read own profile"
  on profiles for select
  using (auth.uid() = id);

grant select on public.profiles to authenticated;

-- trade_applications: intentionally NO policies and NO grants for anon or
-- authenticated. Applicants submit via a Server Action that uses the
-- secret-key client internally — this is trusted server code, not a 
-- client-side insert, so no RLS/grant relaxation is needed for public 
-- submission. Only the secret-key client (which bypasses RLS entirely) 
-- reads or writes this table, from server-verified admin actions. 
-- Do not add a public insert policy here — it isn't needed and would be 
-- a wider door than necessary.

-- Grant full access to service_role for admin operations on trade_applications
grant select, insert, update, delete on public.trade_applications to service_role;
