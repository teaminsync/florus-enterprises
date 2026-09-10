'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendEmail } from '@/utils/email/send';
import { tradeAccountActivatedEmail, passwordChangedConfirmationEmail } from '@/utils/email/templates';

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
      error: 'This link may have expired or already been used. If you received an invitation email from Florus Enterprises, please use the link in that email to set your password. If you\'re having trouble, contact us at team@florus.in.',
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

  // Fetch profile BEFORE updating password_set flag to determine if this is first-time activation or reset
  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from('profiles')
    .select('full_name, password_set')
    .eq('id', user.id)
    .single();

  const wasAlreadyActive = profile?.password_set === true;

  // Mark password as set in the profile
  const { error: profileUpdateError } = await adminClient
    .from('profiles')
    .update({ password_set: true })
    .eq('id', user.id);

  if (profileUpdateError) {
    console.error('Failed to update password_set flag:', profileUpdateError);
    // Don't fail the action - password is already set, this is just a tracking flag
  }

  // Send appropriate email based on whether this is first-time activation or password reset
  if (profile && user.email) {
    const emailTemplate = wasAlreadyActive
      ? passwordChangedConfirmationEmail(profile.full_name)
      : tradeAccountActivatedEmail(profile.full_name);
    
    await sendEmail({
      to: user.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    }).catch((err) => {
      console.error('Failed to send email:', err);
      // Don't fail the action if email fails
    });
  }

  // Redirect to dashboard
  redirect('/trade/dashboard');
}
