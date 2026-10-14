'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { sendEmail } from '@/utils/email/send';
import { passwordResetRequestedEmail } from '@/utils/email/templates';

export async function requestPasswordResetAction(formData: FormData) {
  const email = formData.get('email')?.toString().trim();

  if (!email) {
    return {
      success: false,
      error: 'Please provide your email address.',
    };
  }

  const adminClient = createAdminClient();

  try {
    // Check if account exists using pagination-safe RPC
    let emailToUse = email;
    let { data: emailExists, error: checkError } = await adminClient
      .rpc('check_auth_email_exists', { check_email: email });

    if (checkError) {
      console.error('Failed to check existing email:', checkError);
      // Fall through to generic success response
    }

    // If not found and email has uppercase, try lowercased version
    if (!emailExists && email.toLowerCase() !== email) {
      const lowercasedEmail = email.toLowerCase();
      const { data: lowercaseExists, error: lowercaseCheckError } = await adminClient
        .rpc('check_auth_email_exists', { check_email: lowercasedEmail });

      if (lowercaseCheckError) {
        console.error('Failed to check lowercased email:', lowercaseCheckError);
      } else if (lowercaseExists) {
        emailExists = true;
        emailToUse = lowercasedEmail;
      }
    }

    if (emailExists) {
      // Generate recovery link
      const { data, error: linkError } = await adminClient.auth.admin.generateLink({
        type: 'recovery',
        email: emailToUse,
      });

      if (linkError || !data.properties?.hashed_token) {
        console.error('Failed to generate recovery link:', linkError);
        // Don't reveal this to the user - still return generic success
      } else {
        const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/auth/confirm?token_hash=${data.properties.hashed_token}&type=recovery&next=/trade/set-password`;

        // Send password reset email
        const resetEmailTemplate = passwordResetRequestedEmail(resetUrl);
        await sendEmail({
          to: emailToUse,
          subject: resetEmailTemplate.subject,
          html: resetEmailTemplate.html,
        }).catch((err) => {
          console.error('Failed to send password reset email:', err);
          // Non-fatal - log but don't reveal to user
        });
      }
    }

    // Always return the same generic success message (don't reveal if account exists)
    return {
      success: true,
    };
  } catch (error) {
    console.error('Password reset request error:', error);
    // Still return generic success to avoid email enumeration
    return {
      success: true,
    };
  }
}
