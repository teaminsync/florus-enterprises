import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export async function requireRole(role: 'admin' | 'trade') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(role === 'admin' ? '/trade/login' : '/trade/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, account_type, password_set')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== role) {
    redirect('/trade/login');
  }

  // For trade accounts, also require password to be set (completed onboarding)
  // Admin accounts never go through invite flow, so skip this check for them
  if (role === 'trade' && !profile.password_set) {
    redirect('/trade/set-password');
  }

  return { user, profile };
}
