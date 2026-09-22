'use server';

import { requireRole } from '@/utils/auth/require-role';
import { createAdminClient } from '@/utils/supabase/admin';
import { canAdminTransition } from '@/utils/orders/transitions';
import { sendEmail } from '@/utils/email/send';
import { ADMIN_EMAILS } from '@/utils/email/admin-recipients';
import {
  orderApprovedEmail,
  orderRejectedEmail,
  orderNeedsRevisionEmail,
  orderFulfilledEmail,
  refundFailedAlertEmail,
} from '@/utils/email/templates';

interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * Approve an order (pending_verification → approved)
 */
export async function approveOrderAction(orderId: string): Promise<ActionResult> {
  try {
    const { user } = await requireRole('admin');
    const adminClient = createAdminClient();

    // Re-fetch current order status
    const { data: order, error: fetchError } = await adminClient
      .from('orders')
      .select('id, status, user_id')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) {
      return { success: false, error: 'Order not found' };
    }

    // Validate transition
    if (!canAdminTransition(order.status, 'approved')) {
      return {
        success: false,
        error: `Cannot approve order with status "${order.status}"`,
      };
    }

    // Update order status
    const { error: updateError } = await adminClient
      .from('orders')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (updateError) {
      return { success: false, error: 'Failed to update order status' };
    }

    // Insert status history
    const { error: historyError } = await adminClient
      .from('order_status_history')
      .insert({
        order_id: orderId,
        status: 'approved',
        note: 'Order approved by admin',
        changed_by: user.id,
      });

    if (historyError) {
      console.error('Failed to insert status history:', historyError);
      // Non-fatal - order was updated successfully
    }

    // Send approval email
    const { data: userAuth } = await adminClient.auth.admin.getUserById(order.user_id);
    const { data: userProfile } = await adminClient
      .from('profiles')
      .select('full_name')
      .eq('id', order.user_id)
      .single();

    if (userAuth?.user?.email && userProfile) {
      const approvalEmailTemplate = orderApprovedEmail(userProfile.full_name, orderId);
      await sendEmail({
        to: userAuth.user.email,
        subject: approvalEmailTemplate.subject,
        html: approvalEmailTemplate.html,
      }).catch((err) => {
        console.error('Failed to send order approval email:', err);
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Approve order error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Reject an order (pending_verification → rejected)
 * If the order was paid online and payment is captured, automatically initiates a refund.
 */
export async function rejectOrderAction(
  orderId: string,
  feedback: string
): Promise<ActionResult> {
  try {
    const { user } = await requireRole('admin');
    const adminClient = createAdminClient();

    if (!feedback.trim()) {
      return { success: false, error: 'Rejection reason is required' };
    }

    // Re-fetch current order status with payment fields
    const { data: order, error: fetchError } = await adminClient
      .from('orders')
      .select('id, status, user_id, payment_method, payment_status, razorpay_payment_id, total_incl_gst')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) {
      return { success: false, error: 'Order not found' };
    }

    // Validate transition
    if (!canAdminTransition(order.status, 'rejected')) {
      return {
        success: false,
        error: `Cannot reject order with status "${order.status}"`,
      };
    }

    // Update order status and feedback
    const { error: updateError } = await adminClient
      .from('orders')
      .update({
        status: 'rejected',
        admin_feedback: feedback,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) {
      return { success: false, error: 'Failed to update order status' };
    }

    // Insert status history
    const { error: historyError } = await adminClient
      .from('order_status_history')
      .insert({
        order_id: orderId,
        status: 'rejected',
        note: feedback,
        changed_by: user.id,
      });

    if (historyError) {
      console.error('Failed to insert status history:', historyError);
      // Non-fatal - order was updated successfully
    }

    // AUTOMATIC REFUND: if order was paid online and payment is captured
    if (order.payment_method === 'online' && order.payment_status === 'captured' && order.razorpay_payment_id) {
      try {
        // Import Razorpay client
        const { razorpayClient } = await import('@/utils/razorpay/client');

        // DIAGNOSTIC: Log the exact refund amount being calculated
        const refundAmountPaise = Math.round(order.total_incl_gst * 100);
        console.log('Attempting refund:', {
          orderId,
          razorpayPaymentId: order.razorpay_payment_id,
          totalInclGstRaw: order.total_incl_gst,
          totalInclGstType: typeof order.total_incl_gst,
          computedAmountPaise: refundAmountPaise,
        });

        // Initiate full refund (amount in paise)
        const refund = await razorpayClient.payments.refund(order.razorpay_payment_id, {
          amount: refundAmountPaise,
        });

        // Update order with refund details
        await adminClient
          .from('orders')
          .update({
            payment_status: 'refund_initiated',
            razorpay_refund_id: refund.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId);

        console.log('Refund initiated for rejected order:', {
          orderId,
          refundId: refund.id,
          paymentId: order.razorpay_payment_id,
        });

      } catch (refundError) {
        // CRITICAL: Refund failed but rejection still stands
        console.error('CRITICAL: Refund failed for order', orderId, refundError);

        // Update payment status to refund_failed
        await adminClient
          .from('orders')
          .update({
            payment_status: 'refund_failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId);

        // Send URGENT admin alert (DISTINCT from normal rejection email)
        const alert = refundFailedAlertEmail(orderId, order.razorpay_payment_id);
        
        await sendEmail({
          to: ADMIN_EMAILS,
          subject: alert.subject,
          html: alert.html,
        }).catch((err) => {
          console.error('Failed to send refund failed alert:', err);
        });

        // Do NOT return error - order rejection succeeded, only refund failed
      }
    }

    // Send rejection email
    const { data: userAuth } = await adminClient.auth.admin.getUserById(order.user_id);
    const { data: userProfile } = await adminClient
      .from('profiles')
      .select('full_name')
      .eq('id', order.user_id)
      .single();

    if (userAuth?.user?.email && userProfile) {
      const rejectionEmailTemplate = orderRejectedEmail(
        userProfile.full_name,
        orderId,
        feedback
      );
      await sendEmail({
        to: userAuth.user.email,
        subject: rejectionEmailTemplate.subject,
        html: rejectionEmailTemplate.html,
      }).catch((err) => {
        console.error('Failed to send order rejection email:', err);
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Reject order error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Mark order as needing revision (pending_verification → needs_revision)
 */
export async function markNeedsRevisionAction(
  orderId: string,
  feedback: string
): Promise<ActionResult> {
  try {
    const { user } = await requireRole('admin');
    const adminClient = createAdminClient();

    if (!feedback.trim()) {
      return { success: false, error: 'Revision instructions are required' };
    }

    // Re-fetch current order status
    const { data: order, error: fetchError } = await adminClient
      .from('orders')
      .select('id, status, user_id')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) {
      return { success: false, error: 'Order not found' };
    }

    // Validate transition
    if (!canAdminTransition(order.status, 'needs_revision')) {
      return {
        success: false,
        error: `Cannot mark order with status "${order.status}" as needing revision`,
      };
    }

    // Update order status and feedback
    const { error: updateError } = await adminClient
      .from('orders')
      .update({
        status: 'needs_revision',
        admin_feedback: feedback,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) {
      return { success: false, error: 'Failed to update order status' };
    }

    // Insert status history
    const { error: historyError } = await adminClient
      .from('order_status_history')
      .insert({
        order_id: orderId,
        status: 'needs_revision',
        note: feedback,
        changed_by: user.id,
      });

    if (historyError) {
      console.error('Failed to insert status history:', historyError);
      // Non-fatal - order was updated successfully
    }

    // Send needs revision email
    const { data: userAuth } = await adminClient.auth.admin.getUserById(order.user_id);
    const { data: userProfile } = await adminClient
      .from('profiles')
      .select('full_name')
      .eq('id', order.user_id)
      .single();

    if (userAuth?.user?.email && userProfile) {
      const revisionEmailTemplate = orderNeedsRevisionEmail(
        userProfile.full_name,
        orderId,
        feedback
      );
      await sendEmail({
        to: userAuth.user.email,
        subject: revisionEmailTemplate.subject,
        html: revisionEmailTemplate.html,
      }).catch((err) => {
        console.error('Failed to send needs revision email:', err);
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Mark needs revision error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Mark order as fulfilled (approved → fulfilled)
 */
export async function markFulfilledAction(orderId: string): Promise<ActionResult> {
  try {
    const { user } = await requireRole('admin');
    const adminClient = createAdminClient();

    // Re-fetch current order status
    const { data: order, error: fetchError } = await adminClient
      .from('orders')
      .select('id, status, user_id')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) {
      return { success: false, error: 'Order not found' };
    }

    // Validate transition
    if (!canAdminTransition(order.status, 'fulfilled')) {
      return {
        success: false,
        error: `Cannot mark order with status "${order.status}" as fulfilled`,
      };
    }

    // Update order status
    const { error: updateError } = await adminClient
      .from('orders')
      .update({ status: 'fulfilled', updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (updateError) {
      return { success: false, error: 'Failed to update order status' };
    }

    // Insert status history
    const { error: historyError } = await adminClient
      .from('order_status_history')
      .insert({
        order_id: orderId,
        status: 'fulfilled',
        note: 'Order marked as fulfilled',
        changed_by: user.id,
      });

    if (historyError) {
      console.error('Failed to insert status history:', historyError);
      // Non-fatal - order was updated successfully
    }

    // Send fulfillment email
    const { data: userAuth } = await adminClient.auth.admin.getUserById(order.user_id);
    const { data: userProfile } = await adminClient
      .from('profiles')
      .select('full_name')
      .eq('id', order.user_id)
      .single();

    if (userAuth?.user?.email && userProfile) {
      const fulfilledEmailTemplate = orderFulfilledEmail(userProfile.full_name, orderId);
      await sendEmail({
        to: userAuth.user.email,
        subject: fulfilledEmailTemplate.subject,
        html: fulfilledEmailTemplate.html,
      }).catch((err) => {
        console.error('Failed to send order fulfilled email:', err);
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Mark fulfilled error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
