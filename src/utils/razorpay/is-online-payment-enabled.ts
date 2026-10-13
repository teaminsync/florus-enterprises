/**
 * Check if online payment via Razorpay is enabled.
 * 
 * Returns true only if:
 * - All three required environment variables are present and non-empty
 * - In production builds, the key ID must be a live key (rzp_live_*)
 * 
 * This function is safe to call at module scope; it does NOT import the Razorpay SDK.
 */
export function isOnlinePaymentEnabled(): boolean {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  // All three must be present and non-empty
  if (!keyId || !keySecret || !webhookSecret) {
    return false;
  }

  // In production builds, only live keys are allowed
  if (process.env.NODE_ENV === 'production' && !keyId.startsWith('rzp_live_')) {
    return false;
  }

  return true;
}
