'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendEmail } from '@/utils/email/send';
import { tradeAccountActivatedEmail } from '@/utils/email/templates';

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

  // Send account activated email
  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  if (profile && user.email) {
    const activationEmailTemplate = tradeAccountActivatedEmail(profile.full_name);
    await sendEmail({
      to: user.email,
      subject: activationEmailTemplate.subject,
      html: activationEmailTemplate.html,
    }).catch((err) => {
      console.error('Failed to send account activation email:', err);
      // Don't fail the action if email fails
    });
  }

  // Redirect to dashboard
  redirect('/trade/dashboard');
}
