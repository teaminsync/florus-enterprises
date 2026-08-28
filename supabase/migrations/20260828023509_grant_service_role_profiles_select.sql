-- Grant service_role SELECT privilege on profiles table
-- This is needed for the seed-admin.ts script to check if profiles exist
GRANT SELECT ON public.profiles TO service_role;
