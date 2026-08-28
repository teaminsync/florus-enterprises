-- Grant INSERT/UPDATE privileges on profiles to service_role for admin operations
-- (creating profiles when approving trade applications, seeding admin account)
grant insert, update on public.profiles to service_role;
