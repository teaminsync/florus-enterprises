'use server';

import { requireRole } from '@/utils/auth/require-role';
import { createAdminClient } from '@/utils/supabase/admin';
import { canAdminTransition } from '@/utils/orders/transitions';

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
      .select('id, status')
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

    return { success: true };
  } catch (error) {
    console.error('Approve order error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Reject an order (pending_verification → rejected)
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

    // Re-fetch current order status
    const { data: order, error: fetchError } = await adminClient
      .from('orders')
      .select('id, status')
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
      .select('id, status')
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
      .select('id, status')
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

    return { success: true };
  } catch (error) {
    console.error('Mark fulfilled error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
