import { createClient } from '@/utils/supabase/server';

/**
 * Get the current session user with their profile role
 * Returns null if not authenticated or no profile exists
 * This is a lighter-weight version of requireRole for pages that don't enforce authentication
 */
export async function getSessionUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Fetch the profile to get the role
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, account_type, full_name, password_set')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    role: profile.role as 'admin' | 'trade',
    accountType: profile.account_type as 'doctor' | 'pharmacy' | 'retailer' | 'hospital' | null,
    fullName: profile.full_name,
    passwordSet: profile.password_set,
  };
}
