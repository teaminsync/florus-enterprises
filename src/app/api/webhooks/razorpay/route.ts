import { NextRequest, NextResponse, after } from 'next/server';
import { validateWebhookSignature } from 'razorpay/dist/utils/razorpay-utils';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendEmail } from '@/utils/email/send';
import { orphanedPaymentAlertEmail, refundFailedAlertEmail } from '@/utils/email/templates';
import { ADMIN_EMAILS } from '@/utils/email/admin-recipients';

export const maxDuration = 60;

/**
 * Razorpay Webhook Handler
 * 
 * Handles webhook events from Razorpay for payment lifecycle management.
 * Security: validates X-Razorpay-Signature against RAZORPAY_WEBHOOK_SECRET.
 * 
 * Events handled:
 * - payment.captured: safety net for orphaned payments (with grace window)
 * - refund.processed: authoritative refund confirmation
 * - refund.failed: refund failure alert
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Read raw request body (required for signature verification)
    const rawBody = await request.text();
    const signature = request.headers.get('X-Razorpay-Signature');

    if (!signature) {
      console.error('Webhook rejected: missing signature');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // 2. Verify webhook signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('CRITICAL: RAZORPAY_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const isValid = validateWebhookSignature(rawBody, signature, webhookSecret);
    
    if (!isValid) {
      console.error('Webhook rejected: invalid signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // 3. Parse webhook payload
    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const eventId = request.headers.get('x-razorpay-event-id');

    console.log('Razorpay webhook received:', { event, eventId });

    const adminClient = createAdminClient();

    // 4. Handle different event types
    switch (event) {
      case 'payment.captured': {
        const paymentEntity = payload.payload.payment.entity;
        const paymentId = paymentEntity.id;
        const amountInPaise = paymentEntity.amount;

        // Check if order exists for this payment
        const { data: existingOrder } = await adminClient
          .from('orders')
          .select('id')
          .eq('razorpay_payment_id', paymentId)
          .maybeSingle();

        if (!existingOrder) {
          // Payment arrived before order - schedule grace-window check
          console.warn('Orphan check scheduled', { paymentId });
          
          // Use after() to decouple from the response (runs after 200 is returned)
          after(async () => {
            const adminClientDeferred = createAdminClient();
            let orderFound = false;
            const maxAttempts = 8;
            const delayMs = 5000;

            // Poll for up to ~40 seconds
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
              await new Promise((resolve) => setTimeout(resolve, delayMs));

              const { data: orderCheck } = await adminClientDeferred
                .from('orders')
                .select('id')
                .eq('razorpay_payment_id', paymentId)
                .maybeSingle();

              if (orderCheck) {
                orderFound = true;
                console.log('Orphan check cleared: order found', { paymentId, attempt });
                break;
              }
            }

            // If still no order after grace window, send alert
            if (!orderFound) {
              // Check ledger: skip alert if payment was automatically refunded
              try {
                const { data: autoRefund } = await adminClientDeferred
                  .from('auto_refunds')
                  .select('razorpay_payment_id')
                  .eq('razorpay_payment_id', paymentId)
                  .maybeSingle();
                
                if (autoRefund) {
                  console.log('Orphan check cleared: automatically refunded', { paymentId });
                  return;
                }
              } catch (error) {
                console.warn('Could not check auto_refunds ledger before alerting:', error);
                // Continue to send alert
              }

              console.error('CRITICAL: Orphaned payment confirmed after grace window', {
                paymentId,
                amountInPaise,
                eventId,
              });

              const alertTemplate = orphanedPaymentAlertEmail(paymentId, amountInPaise);
              const emailResult = await sendEmail({
                to: ADMIN_EMAILS,
                subject: alertTemplate.subject,
                html: alertTemplate.html,
              });

              if (!emailResult.success) {
                console.error('Failed to send orphaned payment alert:', emailResult.error);
              } else {
                console.log('Orphaned payment alert sent successfully');
              }
            }
          });
        }
        // If order exists, this is just confirmation - no action needed
        break;
      }

      case 'refund.processed': {
        const refundEntity = payload.payload.refund.entity;
        const refundId = refundEntity.id;
        const paymentId = refundEntity.payment_id;

        // Find order by refund_id first, fall back to payment_id
        let order = await adminClient
          .from('orders')
          .select('id, razorpay_payment_id')
          .eq('razorpay_refund_id', refundId)
          .maybeSingle();

        if (!order.data && paymentId) {
          order = await adminClient
            .from('orders')
            .select('id, razorpay_payment_id')
            .eq('razorpay_payment_id', paymentId)
            .maybeSingle();
        }

        if (order.data) {
          // AUTHORITATIVE CONFIRMATION: refund completed successfully
          const { error: updateError } = await adminClient
            .from('orders')
            .update({
              payment_status: 'refunded',
              updated_at: new Date().toISOString(),
            })
            .eq('id', order.data.id);

          if (updateError) {
            console.error('Failed to update order payment_status to refunded:', updateError);
          } else {
            console.log('Order refund confirmed:', { orderId: order.data.id, refundId });
          }
        } else {
          console.warn('Refund processed webhook: order not found', { refundId, paymentId });
        }
        break;
      }

      case 'refund.failed': {
        const refundEntity = payload.payload.refund.entity;
        const refundId = refundEntity.id;
        const paymentId = refundEntity.payment_id;

        // Find order
        let order = await adminClient
          .from('orders')
          .select('id, razorpay_payment_id')
          .eq('razorpay_refund_id', refundId)
          .maybeSingle();

        if (!order.data && paymentId) {
          order = await adminClient
            .from('orders')
            .select('id, razorpay_payment_id')
            .eq('razorpay_payment_id', paymentId)
            .maybeSingle();
        }

        if (order.data) {
          // Update status to refund_failed
          const { error: updateError } = await adminClient
            .from('orders')
            .update({
              payment_status: 'refund_failed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', order.data.id);

          if (updateError) {
            console.error('Failed to update order payment_status to refund_failed:', updateError);
          }

          // Send urgent admin alert
          const alertTemplate = refundFailedAlertEmail(order.data.id, paymentId);
          const emailResult = await sendEmail({
            to: ADMIN_EMAILS,
            subject: alertTemplate.subject,
            html: alertTemplate.html,
          });

          if (!emailResult.success) {
            console.error('Failed to send refund failed alert:', emailResult.error);
          } else {
            console.log('Refund failed alert sent successfully');
          }

          console.error('CRITICAL: Refund failed for order', {
            orderId: order.data.id,
            refundId,
            paymentId,
          });
        } else {
          console.warn('Refund failed webhook: order not found', { refundId, paymentId });
        }
        break;
      }

      default:
        // Ignore other event types
        console.log('Unhandled webhook event:', event);
    }

    // 5. Always return 200 quickly (don't make Razorpay wait)
    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error) {
    console.error('Webhook handler error:', error);
    // Still return 200 to prevent Razorpay retries on transient errors
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
