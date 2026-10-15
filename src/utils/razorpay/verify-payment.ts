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
 * Checks:
 * 1. Payment exists and is captured
 * 2. Payment amount matches expected amount (in paise)
 * 3. Payment is linked to the correct Razorpay order
 * 4. Order belongs to the user making the request
 * 5. Payment and order amounts match
 * 
 * @param params - Payment verification parameters
 * @returns Verification result with success flag and optional error message
 */
export async function verifyRazorpayPayment(
  params: VerifyPaymentParams
): Promise<VerificationResult> {
  const { razorpayPaymentId, razorpayOrderId, expectedAmountPaise, userId } = params;

  try {
    // Dynamic import to avoid import-time failures if env vars are missing
    const { razorpayClient } = await import('./client');

    // Fetch payment details from Razorpay
    let payment = await razorpayClient.payments.fetch(razorpayPaymentId);

    // If payment is not captured yet, retry up to 4 more times with 1 second delay
    // Razorpay may take a moment to update payment status after frontend verification
    let retries = 0;
    const maxRetries = 4;
    while (payment.status !== 'captured' && retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      payment = await razorpayClient.payments.fetch(razorpayPaymentId);
      retries++;
    }

    // Verify payment is captured
    if (payment.status !== 'captured' || !payment.captured) {
      return {
        success: false,
        error: `Payment not captured. Status: ${payment.status}`,
      };
    }

    // Verify payment is linked to the correct order
    if (payment.order_id !== razorpayOrderId) {
      return {
        success: false,
        error: 'Payment does not belong to this order',
      };
    }

    // Verify currency is INR
    if (payment.currency !== 'INR') {
      return {
        success: false,
        error: `Invalid currency: ${payment.currency}`,
      };
    }

    // Verify payment amount matches expected amount
    // API returns amount as number (in paise)
    const paymentAmount = Number(payment.amount);
    if (paymentAmount !== expectedAmountPaise) {
      return {
        success: false,
        error: `Payment amount mismatch. Expected: ₹${expectedAmountPaise / 100}, Got: ₹${paymentAmount / 100}`,
      };
    }

    // Fetch order details to verify ownership
    const order = await razorpayClient.orders.fetch(razorpayOrderId);

    // Verify order belongs to the user
    if (order.notes?.userId !== userId) {
      return {
        success: false,
        error: 'Order does not belong to this user',
      };
    }

    // Verify order amount matches payment amount
    const orderAmount = Number(order.amount);
    if (orderAmount !== paymentAmount) {
      return {
        success: false,
        error: `Order and payment amount mismatch`,
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Payment verification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment verification failed',
    };
  }
}
