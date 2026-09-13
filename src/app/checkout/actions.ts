'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { calculateTradePrice, calculateGstAmount } from '@/utils/pricing';
import { requireTradeAccountReady } from '@/utils/auth/require-trade-account-ready';
import { sendEmail } from '@/utils/email/send';
import { orderSubmittedCustomerEmail, orderSubmittedAdminEmail } from '@/utils/email/templates';
import { ADMIN_EMAILS } from '@/utils/email/admin-recipients';

export async function submitOrderAction(formData: FormData) {
  const userId = formData.get('userId') as string;
  const poFile = formData.get('poFile') as File;
  const paymentMethod = (formData.get('paymentMethod') as string) || 'cod';
  const razorpayOrderId = formData.get('razorpayOrderId') as string | null;
  const razorpayPaymentId = formData.get('razorpayPaymentId') as string | null;
  const razorpaySignature = formData.get('razorpaySignature') as string | null;

  if (!userId || !poFile) {
    return { success: false, error: 'Missing required data' };
  }

  // Check trade account is authenticated and password is set
  const authCheck = await requireTradeAccountReady();
  if (!authCheck.success) {
    return authCheck;
  }

  if (authCheck.userId !== userId) {
    return { success: false, error: 'Authentication error' };
  }

  // If online payment, verify signature BEFORE proceeding
  if (paymentMethod === 'online') {
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return { success: false, error: 'Missing payment verification data' };
    }

    // Verify Razorpay signature
    const crypto = await import('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      console.error('SECURITY: Razorpay signature verification failed', {
        razorpayOrderId,
        razorpayPaymentId,
        userId,
      });
      return {
        success: false,
        error: 'Payment verification failed. Please contact support immediately.',
      };
    }
  }

  const supabase = await createClient();
  const adminClient = createAdminClient();

  // Import the shared cart calculation helper
  const { calculateCartTotal } = await import('@/utils/orders/calculate-cart-total');

  // Calculate cart total server-side (NEVER trust client amounts)
  const cartResult = await calculateCartTotal(userId);
  
  if (!cartResult.success) {
    return { success: false, error: cartResult.error };
  }

  const { totals, cartItems } = cartResult;
  const { subtotalExGst, gstAmount, totalInclGst, orderItems } = totals;

  // 5. Upload PO file to storage
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

  let orderId: string | null = null;

  try {
    // 6. Create order record
    const orderData: any = {
      user_id: userId,
      status: 'pending_verification',
      po_storage_path: storagePath,
      po_original_filename: poFile.name,
      subtotal_ex_gst: subtotalExGst,
      gst_amount: gstAmount,
      total_incl_gst: totalInclGst,
      payment_method: paymentMethod,
    };

    // Add Razorpay fields if online payment
    if (paymentMethod === 'online') {
      orderData.razorpay_order_id = razorpayOrderId;
      orderData.razorpay_payment_id = razorpayPaymentId;
      orderData.payment_status = 'captured';
    }

    const { data: order, error: orderError } = await adminClient
      .from('orders')
      .insert(orderData)
      .select('id')
      .single();

    if (orderError || !order) {
      console.error('Failed to create order:', orderError);
      // Orphaned file - log for manual cleanup
      console.error(`Orphaned PO file at: ${storagePath}`);
      return {
        success: false,
        error: 'Failed to create order. The uploaded file may need manual cleanup.',
      };
    }

    orderId = order.id;

    // 7. Create order items
    const orderItemsWithOrderId = orderItems.map((item) => ({
      order_id: orderId,
      ...item,
    }));

    const { error: itemsError } = await adminClient
      .from('order_items')
      .insert(orderItemsWithOrderId);

    if (itemsError) {
      console.error('Failed to create order items:', itemsError);
      return {
        success: false,
        error: 'Failed to create order items. Order created but incomplete.',
      };
    }

    // 8. Create initial status history entry
    const { error: historyError } = await adminClient
      .from('order_status_history')
      .insert({
        order_id: orderId,
        status: 'pending_verification',
        note: 'Order submitted',
        changed_by: userId,
      });

    if (historyError) {
      console.error('Failed to create status history:', historyError);
      // Non-fatal - order still created successfully
    }

    // 9. Clear the user's cart
    const { error: clearCartError } = await adminClient
      .from('cart_items')
      .delete()
      .eq('user_id', userId);

    if (clearCartError) {
      console.error('Failed to clear cart:', clearCartError);
      // Non-fatal - order created successfully, cart just not cleared
    }

    // 10. Send confirmation emails
    // Fetch user info for emails
    const { data: userAuth } = await adminClient.auth.admin.getUserById(userId);
    const { data: userProfile } = await adminClient
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    if (userAuth?.user?.email && userProfile && orderId) {
      // Send to customer
      const customerEmailTemplate = orderSubmittedCustomerEmail(
        userProfile.full_name,
        orderId,
        totalInclGst
      );
      await sendEmail({
        to: userAuth.user.email,
        subject: customerEmailTemplate.subject,
        html: customerEmailTemplate.html,
      }).catch((err) => {
        console.error('Failed to send customer order confirmation:', err);
      });

      // Send to admins
      const adminEmailTemplate = orderSubmittedAdminEmail(
        userProfile.full_name,
        orderId,
        totalInclGst
      );
      await sendEmail({
        to: ADMIN_EMAILS,
        subject: adminEmailTemplate.subject,
        html: adminEmailTemplate.html,
      }).catch((err) => {
        console.error('Failed to send admin order notification:', err);
      });
    }

    return {
      success: true,
      orderId,
    };
  } catch (error) {
    console.error('Unexpected error during order submission:', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please contact support if the issue persists.',
    };
  }
}

/**
 * Create a Razorpay Order for online payment.
 * Returns the razorpay_order_id, amount in paise, and key_id for client-side checkout.
 */
export async function createRazorpayOrderAction() {
  // Check trade account is authenticated and password is set
  const authCheck = await requireTradeAccountReady();
  if (!authCheck.success) {
    return authCheck;
  }

  const userId = authCheck.userId;

  // Import here to avoid circular dependency issues
  const { calculateCartTotal } = await import('@/utils/orders/calculate-cart-total');

  // Calculate cart total server-side (NEVER trust client amounts)
  const cartResult = await calculateCartTotal(userId);
  
  if (!cartResult.success) {
    return { success: false, error: cartResult.error };
  }

  const { totals } = cartResult;

  try {
    // Import Razorpay client
    const { razorpayClient } = await import('@/utils/razorpay/client');

    // Create Razorpay Order (amount must be in paise)
    const amountInPaise = Math.round(totals.totalInclGst * 100);
    
    const razorpayOrder = await razorpayClient.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      notes: {
        userId,
      },
    });

    // Return order details for client-side Razorpay checkout
    return {
      success: true,
      razorpayOrderId: razorpayOrder.id,
      amountInPaise,
      keyId: process.env.RAZORPAY_KEY_ID!,
    };
  } catch (error) {
    console.error('Failed to create Razorpay order:', error);
    return {
      success: false,
      error: 'Failed to initiate payment. Please try again or contact support.',
    };
  }
}
