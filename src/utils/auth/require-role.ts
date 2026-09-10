import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getAuthHomeRoute } from './get-auth-home-route';

export async function requireRole(role: 'admin' | 'trade') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/trade/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, account_type, password_set')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/trade/login');
  }

  // Role mismatch: redirect to where this session actually belongs
  if (profile.role !== role) {
    redirect(getAuthHomeRoute(profile));
  }

  // For trade accounts, also require password to be set (completed onboarding)
  // Admin accounts never go through invite flow, so skip this check for them
  if (role === 'trade' && !profile.password_set) {
    redirect('/trade/set-password');
  }

  return { user, profile };
}
