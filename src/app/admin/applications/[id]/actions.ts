'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { sendEmail } from '@/utils/email/send';
import { tradeApplicationApprovedEmail, tradeApplicationRejectedEmail } from '@/utils/email/templates';

export async function approveApplicationAction(formData: FormData) {
  const applicationId = formData.get('applicationId') as string;
  const adminUserId = formData.get('adminUserId') as string;

  if (!applicationId || !adminUserId) {
    return { success: false, error: 'Missing application ID or admin user ID.' };
  }

  const adminClient = createAdminClient();

  try {
    // 1. Get application details
    const { data: application, error: fetchError } = await adminClient
      .from('trade_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError || !application) {
      return { success: false, error: 'Application not found.' };
    }

    if (application.status !== 'pending') {
      return { success: false, error: 'Application has already been processed.' };
    }

    // 2. Generate invite link (not sending email - admin will relay manually)
    const { data, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'invite',
      email: application.email,
    });

    if (linkError || !data.user || !data.properties?.hashed_token) {
      console.error('Failed to generate invite link:', linkError);
      return { success: false, error: 'Failed to generate invite link.' };
    }

    const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/auth/confirm?token_hash=${data.properties.hashed_token}&type=invite&next=/trade/set-password`;

    // 3. Create profile for the new user
    const { error: profileError } = await adminClient
      .from('profiles')
      .insert({
        id: data.user.id,
        role: 'trade',
        account_type: application.applicant_type,
        full_name: application.full_name,
        phone: application.phone,
        is_active: true,
      });

    if (profileError) {
      console.error('Failed to create profile:', profileError);
      // Profile creation failed - user invited but no profile
      // Mark application as needs manual intervention
      await adminClient
        .from('trade_applications')
        .update({
          admin_notes: `User created (${data.user.id}) but profile creation failed. Manual intervention required.`,
          reviewed_by: adminUserId,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', applicationId);

      return { success: false, error: 'Profile creation failed. User created but needs manual profile setup.' };
    }

    // 4. Update application status to approved
    const { error: updateError } = await adminClient
      .from('trade_applications')
      .update({
        status: 'approved',
        linked_profile_id: data.user.id,
        reviewed_by: adminUserId,
        reviewed_at: new Date().toISOString(),
        admin_notes: `Approved. User ID: ${data.user.id}. Invite link generated for manual relay.`,
      })
      .eq('id', applicationId);

    if (updateError) {
      console.error('Failed to update application:', updateError);
      return { success: false, error: 'Failed to update application status.' };
    }

    // Send approval email with invite link
    const approvalEmailTemplate = tradeApplicationApprovedEmail(application.full_name, inviteUrl);
    await sendEmail({
      to: application.email,
      subject: approvalEmailTemplate.subject,
      html: approvalEmailTemplate.html,
    }).catch((err) => {
      console.error('Failed to send approval email:', err);
      // Don't fail the action if email fails
    });

    // Success - return the invite URL for display
    return {
      success: true,
      inviteUrl,
    };
  } catch (error) {
    console.error('Unexpected error during approval:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

export async function rejectApplicationAction(formData: FormData) {
  const applicationId = formData.get('applicationId') as string;
  const adminUserId = formData.get('adminUserId') as string;
  const rejectionReason = formData.get('rejectionReason') as string;

  if (!applicationId || !adminUserId) {
    return { success: false, error: 'Missing application ID or admin user ID.' };
  }

  if (!rejectionReason || rejectionReason.trim() === '') {
    return { success: false, error: 'Rejection reason is required.' };
  }

  const adminClient = createAdminClient();

  try {
    // 1. Get application to verify status
    const { data: application, error: fetchError } = await adminClient
      .from('trade_applications')
      .select('status, email, full_name')
      .eq('id', applicationId)
      .single();

    if (fetchError || !application) {
      return { success: false, error: 'Application not found.' };
    }

    if (application.status !== 'pending') {
      return { success: false, error: 'Application has already been processed.' };
    }

    // 2. Update application status to rejected with reason
    const { error: updateError } = await adminClient
      .from('trade_applications')
      .update({
        status: 'rejected',
        rejection_reason: rejectionReason.trim(),
        reviewed_by: adminUserId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', applicationId);

    if (updateError) {
      console.error('Failed to update application:', updateError);
      return { success: false, error: 'Failed to update application status.' };
    }

    // Send rejection email with reason
    const rejectionEmailTemplate = tradeApplicationRejectedEmail(
      application.full_name,
      rejectionReason.trim()
    );
    await sendEmail({
      to: application.email,
      subject: rejectionEmailTemplate.subject,
      html: rejectionEmailTemplate.html,
    }).catch((err) => {
      console.error('Failed to send rejection email:', err);
      // Don't fail the action if email fails
    });

    // Success
    return { success: true };
  } catch (error) {
    console.error('Unexpected error during rejection:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}
