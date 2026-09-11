import { createAdminClient } from '@/utils/supabase/admin';

export type ApplicationDetails = {
  full_name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  applicant_type: string;
  business_or_clinic_name: string | null;
  registration_number: string | null;
  licence_number: string | null;
  gst_number: string | null;
  authorized_signatory: string | null;
};

/**
 * Fetch the approved trade application details for a given user ID.
 * Returns null if no matching approved application is found.
 * 
 * Uses admin client because trade_applications has no RLS/grants for regular clients.
 * This is safe: function is always called with userId from a verified session.
 */
export async function getMyApplicationDetails(userId: string): Promise<ApplicationDetails | null> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('trade_applications')
    .select('full_name, phone, email, address, city, state, pincode, applicant_type, business_or_clinic_name, registration_number, licence_number, gst_number, authorized_signatory')
    .eq('linked_profile_id', userId)
    .eq('status', 'approved')
    .single();

  if (error || !data) {
    return null;
  }

  return data as ApplicationDetails;
}
