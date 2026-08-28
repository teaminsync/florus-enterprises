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
    .select('role, full_name, account_type')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== role) {
    redirect('/trade/login');
  }

  return { user, profile };
}
