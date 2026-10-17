/**
 * Razorpay Payment Verification
 * 
 * Verifies that a payment is valid, captured, matches the expected amount,
 * and belongs to the correct user before allowing order creation.
 * 
 * Prevents fraud scenarios where users could:
 * - Pay for a small cart, then submit a larger order with the same payment ID
 * - Use someone else's payment ID
 * - Use uncaptured or failed payments
 */

interface VerifyPaymentParams {
  razorpayPaymentId: string;
  razorpayOrderId: string;
  expectedAmountPaise: number;
  userId: string;
}

interface VerificationResult {
  success: boolean;
  error?: string;
}

/**
 * Verify payment amount, status, and ownership
 * 
 * Checks (in order):
 * a. Fetch payment (with error handling)
 * b. Retry if status is 'created' or 'authorized'
 * c. Verify payment is captured
 * d. Verify payment binding (order_id and currency)
 * e. Verify ownership and consistency (order fetch and validation)
 * f. Handle cart mismatch with automatic refund
 * g. Return success
 * 
 * @param params - Payment verification parameters
 * @returns Verification result with success flag and optional error message
 */
export async function verifyRazorpayPayment(
  params: VerifyPaymentParams
): Promise<VerificationResult> {
  const { razorpayPaymentId, razorpayOrderId, expectedAmountPaise, userId } = params;

  // Dynamic import to avoid import-time failures if env vars are missing
  let razorpayClient: any;
  try {
    const imported = await import('./client');
    razorpayClient = imported.razorpayClient;
  } catch (error) {
    console.error('Failed to import Razorpay client:', error);
    return {
      success: false,
      error: 'We could not verify your payment right now. If you were charged, please contact support before trying again.',
    };
  }

  // a) Fetch the payment
  let payment: any;
  try {
    payment = await razorpayClient.payments.fetch(razorpayPaymentId);
  } catch (error) {
    console.error('Failed to fetch payment:', error);
    return {
      success: false,
      error: 'We could not verify your payment right now. If you were charged, please contact support before trying again.',
    };
  }

  // b) If payment status is 'created' or 'authorized', retry up to 4 more times
  let retries = 0;
  const maxRetries = 4;
  while ((payment.status === 'created' || payment.status === 'authorized') && retries < maxRetries) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    try {
      payment = await razorpayClient.payments.fetch(razorpayPaymentId);
    } catch (error) {
      console.error('Failed to re-fetch payment:', error);
      return {
        success: false,
        error: 'We could not verify your payment right now. If you were charged, please contact support before trying again.',
      };
    }
    retries++;
  }

  // c) Verify payment is captured
  if (payment.status !== 'captured' || !payment.captured) {
    console.error('Payment not captured:', {
      razorpayPaymentId,
      razorpayOrderId,
      status: payment.status,
      captured: payment.captured,
    });
    return {
      success: false,
      error: 'Your payment is still being confirmed or was not completed. Please do not pay again; contact support if you were charged.',
    };
  }

  // d) Verify payment binding: order_id and currency
  if (payment.order_id !== razorpayOrderId || payment.currency !== 'INR') {
    console.error('CRITICAL: payment binding mismatch', {
      razorpayPaymentId,
      razorpayOrderId,
      paymentOrderId: payment.order_id,
      currency: payment.currency,
    });
    return {
      success: false,
      error: 'We could not match your payment to this order. Please contact support and do not pay again.',
    };
  }

  // e) Fetch order and verify ownership and consistency
  let order: any;
  try {
    order = await razorpayClient.orders.fetch(razorpayOrderId);
  } catch (error) {
    console.error('Failed to fetch order:', error);
    return {
      success: false,
      error: 'We could not verify your payment right now. If you were charged, please contact support before trying again.',
    };
  }

  const paymentAmount = Number(payment.amount);
  const orderAmount = Number(order.amount);

  if (order.notes?.userId !== userId || orderAmount !== paymentAmount) {
    console.error('CRITICAL: payment ownership/consistency mismatch', {
      razorpayPaymentId,
      razorpayOrderId,
      orderUserId: order.notes?.userId,
      expectedUserId: userId,
    });
    return {
      success: false,
      error: 'We could not match your payment to this order. Please contact support and do not pay again.',
    };
  }

  // f) Check cart amount mismatch - automatic refund
  if (paymentAmount !== expectedAmountPaise) {
    console.log('Cart changed during payment, attempting automatic refund', {
      razorpayPaymentId,
      razorpayOrderId,
    });

    try {
      const refund = await razorpayClient.payments.refund(razorpayPaymentId, {
        amount: paymentAmount,
      });

      console.log('Automatic refund successful', {
        razorpayPaymentId,
        refundId: refund.id,
      });

      return {
        success: false,
        error: 'Your cart changed while you were paying, so your payment has been refunded in full. Please review your cart and try again.',
      };
    } catch (error) {
      console.error('CRITICAL: automatic refund failed', {
        razorpayPaymentId,
        razorpayOrderId,
        error,
      });

      return {
        success: false,
        error: 'Your cart changed while you were paying. We could not refund you automatically; our team has been alerted and will refund you. Please do not pay again.',
      };
    }
  }

  // g) All checks passed
  return { success: true };
}
