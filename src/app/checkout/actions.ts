'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { calculateTradePrice, calculateGstAmount } from '@/utils/pricing';
import { sendEmail } from '@/utils/email/send';
import { orderSubmittedCustomerEmail, orderSubmittedAdminEmail } from '@/utils/email/templates';
import { ADMIN_EMAILS } from '@/utils/email/admin-recipients';

export async function submitOrderAction(formData: FormData) {
  const userId = formData.get('userId') as string;
  const poFile = formData.get('poFile') as File;

  if (!userId || !poFile) {
    return { success: false, error: 'Missing required data' };
  }

  const supabase = await createClient();
  const adminClient = createAdminClient();

  // 1. Verify user is authenticated and has trade role
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== userId) {
    return { success: false, error: 'Authentication error' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'trade') {
    return { success: false, error: 'Only trade accounts can place orders' };
  }

  // 2. Re-fetch cart items with current product prices
  const { data: cartItems, error: cartError } = await adminClient
    .from('cart_items')
    .select(`
      id,
      quantity,
      product_id,
      products (
        id,
        name,
        sp,
        gst_percent,
        is_active
      )
    `)
    .eq('user_id', user.id);

  if (cartError || !cartItems || cartItems.length === 0) {
    return { success: false, error: 'Your cart is empty' };
  }

  // 3. Validate all products have pricing and are active
  const invalidItems: string[] = [];
  
  for (const item of cartItems) {
    const product = item.products as any;
    
    if (!product || !product.is_active) {
      invalidItems.push('Inactive product in cart');
    } else if (product.sp === null) {
      invalidItems.push(`${product.name} does not have pricing available`);
    }
  }

  if (invalidItems.length > 0) {
    return {
      success: false,
      error: `Cannot proceed: ${invalidItems.join(', ')}. Please remove these items from your cart.`,
    };
  }

  // 4. Calculate order totals from current prices
  let subtotalExGst = 0;
  let totalGstAmount = 0; // Accumulate GST from each line
  const orderItems: Array<{
    product_id: string;
    quantity: number;
    unit_price_ex_gst_snapshot: number;
  }> = [];

  for (const item of cartItems) {
    const product = item.products as any;
    const unitPriceExGst = calculateTradePrice(product.sp);
    const lineSubtotalExGst = Math.round(unitPriceExGst * item.quantity * 100) / 100;
    const lineGst = calculateGstAmount(lineSubtotalExGst, product.gst_percent);

    subtotalExGst += lineSubtotalExGst;
    totalGstAmount += lineGst; // Accumulate each line's GST

    orderItems.push({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price_ex_gst_snapshot: unitPriceExGst,
    });
  }

  // Round total GST to 2 decimal places
  const gstAmount = Math.round(totalGstAmount * 100) / 100;
  const totalInclGst = subtotalExGst + gstAmount;

  // 5. Upload PO file to storage
  const timestamp = Date.now();
  const fileExtension = poFile.name.split('.').pop();
  const storagePath = `${user.id}/${timestamp}-${poFile.name}`;

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
    const { data: order, error: orderError } = await adminClient
      .from('orders')
      .insert({
        user_id: user.id,
        status: 'pending_verification',
        po_storage_path: storagePath,
        po_original_filename: poFile.name,
        subtotal_ex_gst: subtotalExGst,
        gst_amount: gstAmount,
        total_incl_gst: totalInclGst,
      })
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
        changed_by: user.id,
      });

    if (historyError) {
      console.error('Failed to create status history:', historyError);
      // Non-fatal - order still created successfully
    }

    // 9. Clear the user's cart
    const { error: clearCartError } = await adminClient
      .from('cart_items')
      .delete()
      .eq('user_id', user.id);

    if (clearCartError) {
      console.error('Failed to clear cart:', clearCartError);
      // Non-fatal - order created successfully, cart just not cleared
    }

    // 10. Send confirmation emails
    // Fetch user info for emails
    const { data: userAuth } = await adminClient.auth.admin.getUserById(user.id);
    const { data: userProfile } = await adminClient
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
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
