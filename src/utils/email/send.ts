import { resend } from './client';

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  replyTo = 'team@florus.in',
}: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Florus Enterprises <team@florus.in>',
      to: Array.isArray(to) ? to : [to],
      replyTo,
      subject,
      html,
    });

    if (error) {
      console.error('Resend API error:', {
        recipient: to,
        subject,
        error,
      });
      return { success: false, error: error.message || 'Unknown email send error' };
    }

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Email send exception:', {
      recipient: to,
      subject,
      error: errorMessage,
    });
    return { success: false, error: errorMessage };
  }
}
