'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return {
      success: false,
      error: 'Email and password are required',
    };
  }

  const supabase = await createClient();

  // Attempt sign in
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    return {
      success: false,
      error: 'Invalid email or password',
    };
  }

  // Get user's role from profiles
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !profile) {
    // User authenticated but has no profile - this shouldn't happen in normal flow
    await supabase.auth.signOut();
    return {
      success: false,
      error: 'Account not properly configured. Please contact support.',
    };
  }

  // Redirect based on role
  if (profile.role === 'admin') {
    redirect('/admin');
  } else if (profile.role === 'trade') {
    redirect('/trade/dashboard');
  } else {
    // Unknown role
    await supabase.auth.signOut();
    return {
      success: false,
      error: 'Invalid account type',
    };
  }
}
