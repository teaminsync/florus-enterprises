'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export async function setPasswordAction(formData: FormData) {
  const password = formData.get('password') as string;

  if (!password || password.length < 8) {
    return {
      success: false,
      error: 'Password must be at least 8 characters long',
    };
  }

  const supabase = await createClient();

  // Check if user is authenticated (should be after /auth/confirm)
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: 'You must be logged in to set a password',
    };
  }

  // Update the user's password
  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    console.error('Password update error:', error);
    return {
      success: false,
      error: 'Failed to set password. Please try again.',
    };
  }

  // Redirect to dashboard
  redirect('/trade/dashboard');
}
