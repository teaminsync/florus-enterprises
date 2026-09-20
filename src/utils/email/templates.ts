const BRAND_COLOR = '#009EE0';
const ALERT_COLOR = '#DC2626'; // Red for urgent alerts
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

function getEmailWrapper(bodyHtml: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                <!-- Header -->
                <tr>
                  <td style="background-color: ${BRAND_COLOR}; padding: 30px 40px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Florus Enterprises</h1>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding: 40px;">
                    ${bodyHtml}
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9f9f9; padding: 30px 40px; text-align: center; border-top: 1px solid #e0e0e0;">
                    <p style="margin: 0; color: #666666; font-size: 14px;">This is an automated message from Florus Enterprises</p>
                    <p style="margin: 10px 0 0 0; color: #999999; font-size: 12px;">Please do not reply directly to this email</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function getAlertEmailWrapper(bodyHtml: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 2px solid ${ALERT_COLOR};">
                <!-- Header -->
                <tr>
                  <td style="background-color: ${ALERT_COLOR}; padding: 30px 40px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">⚠️ URGENT ALERT</h1>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding: 40px; background-color: #FEF2F2;">
                    ${bodyHtml}
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background-color: #FEE2E2; padding: 30px 40px; text-align: center; border-top: 2px solid ${ALERT_COLOR};">
                    <p style="margin: 0; color: #991B1B; font-size: 14px; font-weight: 600;">⚠️ This is a critical operational alert - immediate action required</p>
                    <p style="margin: 10px 0 0 0; color: #DC2626; font-size: 12px;">Automated alert from Florus Enterprises Payment System</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function getButton(text: string, url: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
      <tr>
        <td align="center">
          <a href="${url}" style="display: inline-block; padding: 14px 32px; background-color: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">${text}</a>
        </td>
      </tr>
    </table>
  `;
}

// 1. Trade Application Submitted - Applicant
export function tradeApplicationSubmittedApplicantEmail(fullName: string): { subject: string; html: string } {
  const bodyHtml = `
    <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Application Received</h2>
    <p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">Hi ${fullName},</p>
    <p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">Thank you for applying to become a trade partner with Florus Enterprises. We've received your application and our team will review it shortly.</p>
    <p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">You'll receive an email from us once we've completed our review.</p>
    <p style="margin: 24px 0 0 0; color: #555555; font-size: 16px; line-height: 1.6;">Best regards,<br>The Florus Team</p>
  `;

  return {
    subject: 'Trade Application Received - Florus Enterprises',
    html: getEmailWrapper(bodyHtml),
  };
}

// 2. Trade Application Submitted - Admin
export function tradeApplicationSubmittedAdminEmail(
  fullName: string,
  applicantType: string,
  applicationId: string
): { subject: string; html: string } {
  const applicationUrl = `${SITE_URL}/admin/applications/${applicationId}`;
  const bodyHtml = `
    <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">New Trade Application</h2>
    <p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">A new trade application has been submitted:</p>
    <ul style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">
      <li><strong>Name:</strong> ${fullName}</li>
      <li><strong>Type:</strong> ${applicantType}</li>
      <li><strong>Application ID:</strong> ${applicationId}</li>
    </ul>
    ${getButton('Review Application', applicationUrl)}
  `;

  return {
    subject: `New Trade Application: ${fullName}`,
    html: getEmailWrapper(bodyHtml),
  };
}

// 3. Trade Application Approved
export function tradeApplicationApprovedEmail(fullName: string, inviteUrl: string): { subject: string; html: string } {
  const bodyHtml = `
    <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Application Approved!</h2>
    <p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">Hi ${fullName},</p>
    <p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">Congratulations! Your application to become a trade partner with Florus Enterprises has been approved.</p>
    <p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">Click the button below to set your password and activate your account:</p>
    ${getButton('Set Your Password', inviteUrl)}
    <p style="margin: 24px 0 0 0; color: #999999; font-size: 14px; line-height: 1.6;"><em>This link is valid for a limited time. Please complete your registration soon.</em></p>
  `;

  return {
    subject: 'Welcome to Florus Enterprises - Set Your Password',
    html: getEmailWrapper(bodyHtml),
  };
}

// 4. Trade Application Rejected
export function tradeApplicationRejectedEmail(fullName: string, rejectionReason: string): { subject: string; html: string } {
  const bodyHtml = `
    <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Application Update</h2>
    <p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">Hi ${fullName},</p>
    <p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">Thank you for your interest in becoming a trade partner with Florus Enterprises. After careful review, we're unable to approve your application at this time.</p>
    <div style="margin: 24px 0; padding: 20px; background-color: #f9f9f9; border-left: 4px solid #e0e0e0; border-radius: 4px;">
      <p style="margin: 0; color: #555555; font-size: 16px; line-height: 1.6;"><strong>Reason:</strong></p>
      <p style="margin: 8px 0 0 0; color: #555555; font-size: 16px; line-height: 1.6;">${rejectionReason}</p>
    </div>
    <p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">If you have questions or would like to discuss this further, please contact us at team@florus.in.</p>
    <p style="margin: 24px 0 0 0; color: #555555; font-size: 16px; line-height: 1.6;">Best regards,<br>The Florus Team</p>
  `;

  return {
    subject: 'Trade Application Update - Florus Enterprises',
    html: getEmailWrapper(bodyHtml),
  };
}

// 5. Trade Account Activated
export function tradeAccountActivatedEmail(fullName: string): { subject: string; html: string } {
  const loginUrl = `${SITE_URL}/trade/login`;
  const bodyHtml = `
    <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Welcome Aboard!</h2>
    <p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">Hi ${fullName},</p>
    <p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">Your Florus Enterprises trade account is now active and ready to use. You can start browsing our catalog and placing orders.</p>
    ${getButton('Browse Catalog', `${SITE_URL}/medicines`)}
    <p style="margin: 24px 0 0 0; color: #555555; font-size: 16px; line-height: 1.6;">You can log in anytime at <a href="${loginUrl}" style="color: ${BRAND_COLOR}; text-decoration: none;">${loginUrl}</a></p>
  `;

  return {
    subject: 'Your Account is Ready - Florus Enterprises',
    html: getEmailWrapper(bodyHtml),
  };
}

// 6. Order Submitted - Customer
export function orderSubmittedCustomerEmail(fullName: string, orderId: string, totalInclGst: number): { subject: string; html: string } {
  const orderUrl = `${SITE_URL}/orders/${orderId}`;
  const bodyHtml = `
    <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Order Received</h2>
    <p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">Hi ${fullName},</p>
    <p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">Thank you for your order. We've received it and our team will review it shortly.</p>
    <ul style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">
      <li><strong>Order ID:</strong> ${orderId}</li>
      <li><strong>Total (incl. GST):</strong> ₹${totalInclGst.toFixed(2)}</li>
    </ul>
    <p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">You'll receive a confirmation email once your order has been approved.</p>
    ${getButton('View Order Details', orderUrl)}
  `;

  return {
    subject: `Order Received #${orderId} - Florus Enterprises`,
    html: getEmailWrapper(bodyHtml),
  };
}

// 7. Order Submitted - Admin
export function orderSubmittedAdminEmail(fullName: string, orderId: string, totalInclGst: number): { subject: string; html: string } {
  const orderUrl = `${SITE_URL}/admin/orders/${orderId}`;
  const bodyHtml = `
    <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">New Order Submitted</h2>
    <p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">A new order has been placed:</p>
    <ul style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">
      <li><strong>Customer:</strong> ${fullName}</li>
      <li><strong>Order ID:</strong> ${orderId}</li>
      <li><strong>Total (incl. GST):</strong> ₹${totalInclGst.toFixed(2)}</li>
    </ul>
    ${getButton('Review Order', orderUrl)}
  `;

  return {
    subject: `New Order: ${fullName} - ₹${totalInclGst.toFixed(2)}`,
    html: getEmailWrapper(bodyHtml),
  };
}

// 8. Order Approved
export function orderApprovedEmail(fullName: string, orderId: string): { subject: string; html: string } {
  const orderUrl = `${SITE_URL}/orders/${orderId}`;
  const bodyHtml = `
    <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Order Approved</h2>
    <p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">Hi ${fullName},</p>
    <p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">Great news! Your order #${orderId} has been approved and is now being processed for fulfillment.</p>
    <p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">We'll notify you when your order has been fulfilled.</p>
    ${getButton('View Order', orderUrl)}
  `;

  return {
    subject: `Order Approved #${orderId} - Florus Enterprises`,
    html: getEmailWrapper(bodyHtml),
  };
}

// 9. Order Rejected
export function orderRejectedEmail(fullName: string, orderId: string, rejectionReason: string): { subject: string; html: string } {
  const orderUrl = `${SITE_URL}/orders/${orderId}`;
  const bodyHtml = `
    <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Order Update</h2>
    <p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">Hi ${fullName},</p>
    <p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">We're unable to process your order #${orderId} at this time.</p>
    <div style="margin: 24px 0; padding: 20px; background-color: #f9f9f9; border-left: 4px solid #e0e0e0; border-radius: 4px;">
      <p style="margin: 0; color: #555555; font-size: 16px; line-height: 1.6;"><strong>Reason:</strong></p>
      <p style="margin: 8px 0 0 0; color: #555555; font-size: 16px; line-height: 1.6;">${rejectionReason}</p>
    </div>
    <p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">If you have questions, please contact us at team@florus.in.</p>
    ${getButton('View Order Details', orderUrl)}
  `;

  return {
    subject: `Order Update #${orderId} - Florus Enterprises`,
    html: getEmailWrapper(bodyHtml),
  };
}

// 10. Order Needs Revision
export function orderNeedsRevisionEmail(fullName: string, orderId: string, revisionReason: string): { subject: string; html: string } {
  const orderUrl = `${SITE_URL}/orders/${orderId}`;
  const bodyHtml = `
    <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Order Revision Needed</h2>
    <p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">Hi ${fullName},</p>
    <p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">Your order #${orderId} requires some changes before we can process it.</p>
    <div style="margin: 24px 0; padding: 20px; background-color: #f9f9f9; border-left: 4px solid #e0e0e0; border-radius: 4px;">
      <p style="margin: 0; color: #555555; font-size: 16px; line-height: 1.6;"><strong>Required Changes:</strong></p>
      <p style="margin: 8px 0 0 0; color: #555555; font-size: 16px; line-height: 1.6;">${revisionReason}</p>
    </div>
    <p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">Please review the order and resubmit with the necessary updates.</p>
    ${getButton('Review and Resubmit', orderUrl)}
  `;

  return {
    subject: `Action Required: Order #${orderId} - Florus Enterprises`,
    html: getEmailWrapper(bodyHtml),
  };
}

// 11. Order Resubmitted - Customer
export function orderResubmittedCustomerEmail(fullName: string, orderId: string): { subject: string; html: string } {
  const orderUrl = `${SITE_URL}/orders/${orderId}`;
  const bodyHtml = `
    <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Revised Order Received</h2>
    <p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">Hi ${fullName},</p>
    <p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">Thank you for resubmitting your order #${orderId}. We've received your updated order and our team will review it shortly.</p>
    <p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">You'll receive a confirmation email once your order has been approved.</p>
    ${getButton('View Order Details', orderUrl)}
  `;

  return {
    subject: `Revised Order Received #${orderId} - Florus Enterprises`,
    html: getEmailWrapper(bodyHtml),
  };
}

// 12. Order Resubmitted - Admin
export function orderResubmittedAdminEmail(fullName: string, orderId: string): { subject: string; html: string } {
  const orderUrl = `${SITE_URL}/admin/orders/${orderId}`;
  const bodyHtml = `
    <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Order Resubmitted</h2>
    <p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">An order has been resubmitted for review:</p>
    <ul style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">
      <li><strong>Customer:</strong> ${fullName}</li>
      <li><strong>Order ID:</strong> ${orderId}</li>
    </ul>
    ${getButton('Review Order', orderUrl)}
  `;

  return {
    subject: `Order Resubmitted: ${fullName} #${orderId}`,
    html: getEmailWrapper(bodyHtml),
  };
}

// 13. Order Fulfilled
export function orderFulfilledEmail(fullName: string, orderId: string): { subject: string; html: string } {
  const orderUrl = `${SITE_URL}/orders/${orderId}`;
  const bodyHtml = `
    <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Order Fulfilled</h2>
    <p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">Hi ${fullName},</p>
    <p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">Your order #${orderId} has been fulfilled. Thank you for your business!</p>
    <p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">We appreciate your partnership with Florus Enterprises.</p>
    ${getButton('View Order Details', orderUrl)}
  `;

  return {
    subject: `Order Fulfilled #${orderId} - Florus Enterprises`,
    html: getEmailWrapper(bodyHtml),
  };
}

// 14. Contact Form Submitted - Visitor Confirmation
export function contactFormSubmittedEmail(fullName: string): { subject: string; html: string } {
  const bodyHtml = `
    <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Message Received</h2>
    <p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">Hi ${fullName},</p>
    <p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">Thank you for reaching out to Florus Enterprises. We've received your message and our team will get back to you soon.</p>
    <p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">We typically respond within 1-2 business days.</p>
    <p style="margin: 24px 0 0 0; color: #555555; font-size: 16px; line-height: 1.6;">Best regards,<br>The Florus Team</p>
  `;

  return {
    subject: 'Thank You for Contacting Us - Florus Enterprises',
    html: getEmailWrapper(bodyHtml),
  };
}

// 15. Password Reset Requested
export function passwordResetRequestedEmail(resetUrl: string): { subject: string; html: string } {
  const bodyHtml = `
    <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Reset Your Password</h2>
    <p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">We received a request to reset your password for your Florus Enterprises account.</p>
    <p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">Click the button below to set a new password:</p>
    ${getButton('Reset Password', resetUrl)}
    <p style="margin: 24px 0 0 0; color: #999999; font-size: 14px; line-height: 1.6;"><em>This link is valid for a limited time. If you didn't request this password reset, you can safely ignore this email.</em></p>
  `;

  return {
    subject: 'Reset Your Password - Florus Enterprises',
    html: getEmailWrapper(bodyHtml),
  };
}

// 16. Password Changed Confirmation
export function passwordChangedConfirmationEmail(fullName: string): { subject: string; html: string } {
  const bodyHtml = `
    <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Password Changed</h2>
    <p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">Hi ${fullName},</p>
    <p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">Your Florus Enterprises account password was just changed.</p>
    <p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;">If you made this change, no action is needed.</p>
    <p style="margin: 0 0 16px 0; color: #555555; font-size: 16px; line-height: 1.6;"><strong>If you did NOT make this change, please contact us immediately at team@florus.in.</strong></p>
    <p style="margin: 24px 0 0 0; color: #555555; font-size: 16px; line-height: 1.6;">Best regards,<br>The Florus Team</p>
  `;

  return {
    subject: 'Your Password Was Changed - Florus Enterprises',
    html: getEmailWrapper(bodyHtml),
  };
}

// 17. Orphaned Payment Alert (Admin)
export function orphanedPaymentAlertEmail(paymentId: string, amountInPaise: number): { subject: string; html: string } {
  const amountInRupees = (amountInPaise / 100).toFixed(2);
  const bodyHtml = `
    <h2 style="margin: 0 0 20px 0; color: #991B1B; font-size: 24px; font-weight: 700;">⚠️ Orphaned Payment Detected</h2>
    <p style="margin: 0 0 16px 0; color: #7C2D12; font-size: 16px; line-height: 1.6;"><strong>CRITICAL:</strong> A Razorpay payment was successfully captured, but NO corresponding order exists in the system.</p>
    
    <div style="background-color: #FEE2E2; border-left: 4px solid #DC2626; padding: 16px; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; color: #7C2D12; font-size: 14px;"><strong>Payment ID:</strong> <code style="background-color: #FCA5A5; padding: 2px 6px; border-radius: 3px; font-family: monospace;">${paymentId}</code></p>
      <p style="margin: 0; color: #7C2D12; font-size: 14px;"><strong>Amount:</strong> ₹${amountInRupees}</p>
    </div>

    <p style="margin: 24px 0 16px 0; color: #7C2D12; font-size: 16px; line-height: 1.6;"><strong>Possible causes:</strong></p>
    <ul style="margin: 0 0 24px 0; padding-left: 24px; color: #7C2D12; font-size: 15px; line-height: 1.8;">
      <li>Signature verification failed after payment capture</li>
      <li>Browser closed mid-transaction after Razorpay success but before order insert</li>
      <li>Database error during order creation</li>
    </ul>

    <p style="margin: 0 0 16px 0; color: #7C2D12; font-size: 16px; line-height: 1.6;"><strong>Required actions:</strong></p>
    <ol style="margin: 0 0 24px 0; padding-left: 24px; color: #7C2D12; font-size: 15px; line-height: 1.8;">
      <li>Log into the Razorpay Dashboard and locate this payment</li>
      <li>Identify the customer from payment metadata/notes (userId)</li>
      <li>Contact the customer to confirm their order intent</li>
      <li>Either manually create the order in the system, or process a manual refund via Razorpay Dashboard</li>
    </ol>

    <p style="margin: 24px 0 0 0; color: #991B1B; font-size: 14px; line-height: 1.6;"><strong>Do not ignore this alert.</strong> Real money has been collected with no corresponding order.</p>
  `;

  return {
    subject: '🚨 URGENT: Orphaned Payment Detected - Manual Action Required',
    html: getAlertEmailWrapper(bodyHtml),
  };
}

// 18. Refund Failed Alert (Admin)
export function refundFailedAlertEmail(orderId: string, paymentId: string): { subject: string; html: string } {
  const orderUrl = `${SITE_URL}/admin/orders/${orderId}`;
  const bodyHtml = `
    <h2 style="margin: 0 0 20px 0; color: #991B1B; font-size: 24px; font-weight: 700;">⚠️ Refund Failed</h2>
    <p style="margin: 0 0 16px 0; color: #7C2D12; font-size: 16px; line-height: 1.6;"><strong>CRITICAL:</strong> An automatic refund attempt failed for a rejected order.</p>
    
    <div style="background-color: #FEE2E2; border-left: 4px solid #DC2626; padding: 16px; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; color: #7C2D12; font-size: 14px;"><strong>Order ID:</strong> <code style="background-color: #FCA5A5; padding: 2px 6px; border-radius: 3px; font-family: monospace;">${orderId}</code></p>
      <p style="margin: 0; color: #7C2D12; font-size: 14px;"><strong>Payment ID:</strong> <code style="background-color: #FCA5A5; padding: 2px 6px; border-radius: 3px; font-family: monospace;">${paymentId}</code></p>
    </div>

    <p style="margin: 24px 0 16px 0; color: #7C2D12; font-size: 16px; line-height: 1.6;"><strong>The order has been successfully rejected, but the customer's payment could not be automatically refunded.</strong></p>

    <p style="margin: 0 0 16px 0; color: #7C2D12; font-size: 16px; line-height: 1.6;"><strong>Required actions:</strong></p>
    <ol style="margin: 0 0 24px 0; padding-left: 24px; color: #7C2D12; font-size: 15px; line-height: 1.8;">
      <li>Log into the Razorpay Dashboard</li>
      <li>Locate payment ID: <code style="background-color: #FCA5A5; padding: 2px 6px; border-radius: 3px; font-family: monospace;">${paymentId}</code></li>
      <li>Process a manual refund through the Dashboard</li>
      <li>Update the order's payment_status in the database once confirmed</li>
      <li>Optionally notify the customer directly about the refund timeline</li>
    </ol>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
      <tr>
        <td align="center">
          <a href="${orderUrl}" style="display: inline-block; padding: 14px 32px; background-color: ${ALERT_COLOR}; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">View Order Details</a>
        </td>
      </tr>
    </table>

    <p style="margin: 24px 0 0 0; color: #991B1B; font-size: 14px; line-height: 1.6;"><strong>Do not ignore this alert.</strong> The customer is expecting a refund for this rejected order.</p>
  `;

  return {
    subject: `🚨 URGENT: Refund Failed for Order #${orderId.slice(0, 8)}`,
    html: getAlertEmailWrapper(bodyHtml),
  };
}
