-- Create function to check if an email exists in auth.users
create or replace function public.check_auth_email_exists(check_email text)
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select exists (select 1 from auth.users where email = check_email);
$$;

-- Lock down permissions: only service_role can execute
revoke all on function public.check_auth_email_exists(text) from public, anon, authenticated;
grant execute on function public.check_auth_email_exists(text) to service_role;
