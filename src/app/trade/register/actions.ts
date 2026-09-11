'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { sendEmail } from '@/utils/email/send';
import { tradeApplicationSubmittedApplicantEmail, tradeApplicationSubmittedAdminEmail } from '@/utils/email/templates';
import { ADMIN_EMAILS } from '@/utils/email/admin-recipients';

export async function submitTradeApplication(formData: FormData) {
  // Server-side validation
  const applicantType = formData.get('applicant_type') as string;
  const fullName = formData.get('full_name') as string;
  const phone = formData.get('phone') as string;
  const email = formData.get('email') as string;
  const address = formData.get('address') as string;
  const city = formData.get('city') as string;
  const state = formData.get('state') as string;
  const pincode = formData.get('pincode') as string;

  // Optional fields based on type
  const businessOrClinicName = formData.get('business_or_clinic_name') as string | null;
  const registrationNumber = formData.get('registration_number') as string | null;
  const licenceNumber = formData.get('licence_number') as string | null;
  const gstNumber = formData.get('gst_number') as string | null;
  const authorizedSignatory = formData.get('authorized_signatory') as string | null;

  // Validate required fields
  if (!applicantType || !fullName || !phone || !email || !address || !city || !state || !pincode) {
    return {
      success: false,
      error: 'All required fields must be filled',
    };
  }

  // Validate applicant type
  if (!['doctor', 'pharmacy', 'retailer', 'hospital'].includes(applicantType)) {
    return {
      success: false,
      error: 'Invalid applicant type',
    };
  }

  // Type-specific field validation per the field matrix
  if (applicantType === 'doctor') {
    if (!registrationNumber || !businessOrClinicName) {
      return {
        success: false,
        error: 'Medical Registration Number and Hospital/Clinic Name are required for doctors',
      };
    }
  } else if (applicantType === 'pharmacy' || applicantType === 'retailer') {
    if (!businessOrClinicName || !licenceNumber || !gstNumber) {
      return {
        success: false,
        error: 'Firm/Business Name, Drug Licence Number, and GST No. are required',
      };
    }
  } else if (applicantType === 'hospital') {
    if (!businessOrClinicName || !registrationNumber || !gstNumber || !authorizedSignatory) {
      return {
        success: false,
        error: 'Institution/Hospital Name, Hospital Registration Number, GST No., and Authorized Signatory are required for hospitals',
      };
    }
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      success: false,
      error: 'Invalid email address',
    };
  }

  try {
    // Use admin client to insert into trade_applications
    const adminClient = createAdminClient();

    // Check if email already has an auth.users account
    const { data: emailExists, error: checkError } = await adminClient
      .rpc('check_auth_email_exists', { check_email: email });

    if (checkError) {
      console.error('Failed to check existing email:', checkError);
      // Log the error but proceed - the approval-time check still exists as a backstop
    }

    if (emailExists) {
      return {
        success: false,
        error: 'An account with this email already exists. If you believe this is a mistake, please contact us at team@florus.in.',
      };
    }

    const { data: application, error } = await adminClient
      .from('trade_applications')
      .insert({
        applicant_type: applicantType,
        full_name: fullName,
        business_or_clinic_name: businessOrClinicName,
        registration_number: registrationNumber,
        licence_number: licenceNumber,
        gst_number: gstNumber,
        authorized_signatory: authorizedSignatory,
        address,
        city,
        state,
        pincode,
        phone,
        email,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      console.error('Database error:', error);
      return {
        success: false,
        error: 'Failed to submit application. Please try again.',
      };
    }

    // Send confirmation email to applicant
    const applicantEmailTemplate = tradeApplicationSubmittedApplicantEmail(fullName);
    await sendEmail({
      to: email,
      subject: applicantEmailTemplate.subject,
      html: applicantEmailTemplate.html,
    }).catch((err) => {
      console.error('Failed to send applicant confirmation email:', err);
      // Don't fail the action if email fails
    });

    // Send notification email to admins
    const adminEmailTemplate = tradeApplicationSubmittedAdminEmail(
      fullName,
      applicantType,
      application.id
    );
    await sendEmail({
      to: ADMIN_EMAILS,
      subject: adminEmailTemplate.subject,
      html: adminEmailTemplate.html,
    }).catch((err) => {
      console.error('Failed to send admin notification email:', err);
      // Don't fail the action if email fails
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error('Unexpected error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}
