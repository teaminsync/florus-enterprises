'use server';

import { redirect } from 'next/navigation';
import { createAdminClient } from '@/utils/supabase/admin';

export async function approveApplicationAction(formData: FormData) {
  const applicationId = formData.get('applicationId') as string;
  const adminUserId = formData.get('adminUserId') as string;

  if (!applicationId || !adminUserId) {
    redirect('/admin/applications?error=missing_data');
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
      redirect('/admin/applications?error=application_not_found');
    }

    if (application.status !== 'pending') {
      redirect(`/admin/applications/${applicationId}?error=already_processed`);
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

  if (!applicationId || !adminUserId) {
    redirect('/admin/applications?error=missing_data');
  }

  const adminClient = createAdminClient();

  try {
    // 1. Get application to verify status
    const { data: application, error: fetchError } = await adminClient
      .from('trade_applications')
      .select('status')
      .eq('id', applicationId)
      .single();

    if (fetchError || !application) {
      redirect('/admin/applications?error=application_not_found');
    }

    if (application.status !== 'pending') {
      redirect(`/admin/applications/${applicationId}?error=already_processed`);
    }

    // 2. Update application status to rejected
    const { error: updateError } = await adminClient
      .from('trade_applications')
      .update({
        status: 'rejected',
        reviewed_by: adminUserId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', applicationId);

    if (updateError) {
      console.error('Failed to update application:', updateError);
      redirect(`/admin/applications/${applicationId}?error=update_failed`);
    }

    // Success - redirect to applications list
    redirect('/admin/applications?success=rejected');
  } catch (error) {
    console.error('Unexpected error during rejection:', error);
    redirect(`/admin/applications/${applicationId}?error=unexpected`);
  }
}
