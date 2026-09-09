'use server';

import { sendEmail } from '@/utils/email/send';
import { contactFormSubmittedEmail } from '@/utils/email/templates';

interface SubmitContactFormResult {
  success: boolean;
  error?: string;
}

export async function submitContactForm(formData: FormData): Promise<SubmitContactFormResult> {
  try {
    // Extract form fields
    const fullName = formData.get('fullName')?.toString().trim();
    const email = formData.get('email')?.toString().trim();
    const phone = formData.get('phone')?.toString().trim() || '';
    const inquiryType = formData.get('inquiryType')?.toString().trim();
    const message = formData.get('message')?.toString().trim();
    const honeypot = formData.get('website')?.toString().trim();

    // Validate required fields
    if (!fullName || !email || !inquiryType || !message) {
      return {
        success: false,
        error: 'Please fill in all required fields.',
      };
    }

    // Honeypot check - if filled, silently accept but don't process
    if (honeypot) {
      console.log('Honeypot triggered - bot submission detected and discarded');
      return { success: true };
    }

    // POST to Google Apps Script
    const appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_CONTACT_URL;
    if (!appsScriptUrl) {
      console.error('GOOGLE_APPS_SCRIPT_CONTACT_URL is not configured');
      return {
        success: false,
        error: 'Contact form is not properly configured. Please try again later.',
      };
    }

    try {
      const appsScriptResponse = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          inquiryType,
          message,
        }),
      });

      if (!appsScriptResponse.ok) {
        console.error('Apps Script request failed:', {
          status: appsScriptResponse.status,
          statusText: appsScriptResponse.statusText,
        });
        return {
          success: false,
          error: 'Failed to submit your message. Please try again later.',
        };
      }

      // Parse the response to confirm success
      const responseText = await appsScriptResponse.text();
      console.log('Apps Script response:', responseText);
    } catch (appsScriptError) {
      console.error('Apps Script call failed:', appsScriptError);
      return {
        success: false,
        error: 'Failed to submit your message. Please try again later.',
      };
    }

    // Send Resend confirmation email to the visitor
    // This is non-critical - if it fails, we still consider the submission successful
    // since the Apps Script (primary action) already succeeded
    try {
      const confirmationEmail = contactFormSubmittedEmail(fullName);
      const emailResult = await sendEmail({
        to: email,
        subject: confirmationEmail.subject,
        html: confirmationEmail.html,
      });

      if (!emailResult.success) {
        console.error('Confirmation email failed (non-critical):', {
          recipient: email,
          error: emailResult.error,
        });
      }
    } catch (emailError) {
      console.error('Confirmation email exception (non-critical):', emailError);
    }

    return { success: true };
  } catch (err) {
    console.error('Contact form submission error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}
