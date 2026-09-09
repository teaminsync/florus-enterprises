'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { canTradeUserResubmit } from '@/utils/orders/transitions';
import { requireTradeAccountReady } from '@/utils/auth/require-trade-account-ready';
import { sendEmail } from '@/utils/email/send';
import { orderResubmittedCustomerEmail, orderResubmittedAdminEmail } from '@/utils/email/templates';
import { ADMIN_EMAILS } from '@/utils/email/admin-recipients';

interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * Trade user resubmits an order with a new PO file (needs_revision → pending_verification)
 */
export async function resubmitOrderAction(formData: FormData): Promise<ActionResult> {
  try {
    // Check trade account is authenticated and password is set
    const authCheck = await requireTradeAccountReady();
    if (!authCheck.success) {
      return authCheck;
    }

    const userId = authCheck.userId;
    const supabase = await createClient();

    // Get orderId and new PO file from form data
    const orderId = formData.get('orderId') as string;
    const poFile = formData.get('poFile') as File;

    if (!orderId || !poFile) {
      return { success: false, error: 'Missing required data' };
    }

    // Validate file
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(poFile.type)) {
      return { success: false, error: 'Only PDF, JPG, and PNG files are allowed' };
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (poFile.size > maxSize) {
      return { success: false, error: 'File size must be less than 10MB' };
    }

    const adminClient = createAdminClient();

    // Re-fetch order and verify ownership + status
    const { data: order, error: fetchError } = await adminClient
      .from('orders')
      .select('id, user_id, status')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) {
      return { success: false, error: 'Order not found' };
    }

    // Verify ownership
    if (order.user_id !== userId) {
      return { success: false, error: 'You do not have permission to modify this order' };
    }

    // Verify status allows resubmission
    if (!canTradeUserResubmit(order.status)) {
      return {
        success: false,
        error: `Cannot resubmit order with status "${order.status}". Only orders marked as "needs_revision" can be resubmitted.`,
      };
    }

    // Upload new PO file to storage
    const timestamp = Date.now();
    const fileExtension = poFile.name.split('.').pop();
    const storagePath = `${userId}/${timestamp}-${poFile.name}`;

    const { error: uploadError } = await supabase.storage
      .from('po-uploads')
      .upload(storagePath, poFile, {
        contentType: poFile.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Failed to upload PO file:', uploadError);
      return { success: false, error: 'Failed to upload purchase order file' };
    }

    // Update order with new PO path and status back to pending_verification
    const { error: updateError } = await adminClient
      .from('orders')
      .update({
        po_storage_path: storagePath,
        po_original_filename: poFile.name,
        status: 'pending_verification',
        admin_feedback: null, // Clear previous feedback
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Failed to update order:', updateError);
      // Try to clean up uploaded file
      await supabase.storage.from('po-uploads').remove([storagePath]);
      return { success: false, error: 'Failed to update order' };
    }

    // Insert status history entry
    const { error: historyError } = await adminClient
      .from('order_status_history')
      .insert({
        order_id: orderId,
        status: 'pending_verification',
        note: 'PO resubmitted after revision request',
        changed_by: userId,
      });

    if (historyError) {
      console.error('Failed to insert status history:', historyError);
      // Non-fatal - order was updated successfully
    }

    // Send resubmission emails
    const { data: userAuth } = await adminClient.auth.admin.getUserById(userId);
    const { data: userProfile } = await adminClient
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    if (userAuth?.user?.email && userProfile) {
      // Send to customer
      const customerEmailTemplate = orderResubmittedCustomerEmail(
        userProfile.full_name,
        orderId
      );
      await sendEmail({
        to: userAuth.user.email,
        subject: customerEmailTemplate.subject,
        html: customerEmailTemplate.html,
      }).catch((err) => {
        console.error('Failed to send customer resubmission confirmation:', err);
      });

      // Send to admins
      const adminEmailTemplate = orderResubmittedAdminEmail(userProfile.full_name, orderId);
      await sendEmail({
        to: ADMIN_EMAILS,
        subject: adminEmailTemplate.subject,
        html: adminEmailTemplate.html,
      }).catch((err) => {
        console.error('Failed to send admin resubmission notification:', err);
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Resubmit order error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
