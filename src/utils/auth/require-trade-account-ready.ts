import { createClient } from '@/utils/supabase/server';

export async function requireTradeAccountReady(): Promise<
  { success: true; userId: string } | { success: false; error: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: 'You must be logged in.',
    };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, password_set')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'trade') {
    return {
      success: false,
      error: 'Only trade accounts can do this.',
    };
  }

  if (!profile.password_set) {
    return {
      success: false,
      error: 'Please finish setting your password before placing orders.',
    };
  }

  return {
    success: true,
    userId: user.id,
  };
}
