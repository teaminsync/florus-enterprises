import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getMyApplicationDetails } from '@/utils/trade/get-my-application-details';
import { logoutAction } from './actions';

export default async function TradeDashboardPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/trade/login');
  }

  // Get profile to confirm role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, account_type')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'trade') {
    redirect('/trade/login');
  }

  // Get full registration details
  const applicationDetails = await getMyApplicationDetails(user.id);

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Trade Dashboard
          </h1>
          <p className="text-gray-600">
            Welcome back, {profile.full_name}
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Account Information
          </h2>
          <dl className="space-y-3">
            <div className="flex">
              <dt className="text-sm font-medium text-gray-500 w-40">Full Name:</dt>
              <dd className="text-sm text-gray-900">{profile.full_name}</dd>
            </div>
            <div className="flex">
              <dt className="text-sm font-medium text-gray-500 w-40">Email:</dt>
              <dd className="text-sm text-gray-900">{user.email}</dd>
            </div>
            {applicationDetails?.phone && (
              <div className="flex">
                <dt className="text-sm font-medium text-gray-500 w-40">Phone:</dt>
                <dd className="text-sm text-gray-900">{applicationDetails.phone}</dd>
              </div>
            )}
            <div className="flex">
              <dt className="text-sm font-medium text-gray-500 w-40">Account Type:</dt>
              <dd className="text-sm text-gray-900 capitalize">{profile.account_type}</dd>
            </div>
            {applicationDetails?.business_or_clinic_name && (
              <div className="flex">
                <dt className="text-sm font-medium text-gray-500 w-40">
                  {applicationDetails.applicant_type === 'doctor' ? 'Hospital/Clinic Name:' :
                   applicationDetails.applicant_type === 'hospital' ? 'Institution Name:' :
                   'Business Name:'}
                </dt>
                <dd className="text-sm text-gray-900">{applicationDetails.business_or_clinic_name}</dd>
              </div>
            )}
            {applicationDetails?.registration_number && (
              <div className="flex">
                <dt className="text-sm font-medium text-gray-500 w-40">
                  {applicationDetails.applicant_type === 'hospital' ? 'Hospital Registration:' : 'Medical Registration:'}
                </dt>
                <dd className="text-sm text-gray-900">{applicationDetails.registration_number}</dd>
              </div>
            )}
            {applicationDetails?.licence_number && (
              <div className="flex">
                <dt className="text-sm font-medium text-gray-500 w-40">Drug Licence No.:</dt>
                <dd className="text-sm text-gray-900">{applicationDetails.licence_number}</dd>
              </div>
            )}
            {applicationDetails?.gst_number && (
              <div className="flex">
                <dt className="text-sm font-medium text-gray-500 w-40">GST No.:</dt>
                <dd className="text-sm text-gray-900">{applicationDetails.gst_number}</dd>
              </div>
            )}
            {applicationDetails?.authorized_signatory && (
              <div className="flex">
                <dt className="text-sm font-medium text-gray-500 w-40">Authorized Signatory:</dt>
                <dd className="text-sm text-gray-900">{applicationDetails.authorized_signatory}</dd>
              </div>
            )}
            {applicationDetails && (
              <div className="flex">
                <dt className="text-sm font-medium text-gray-500 w-40">Address:</dt>
                <dd className="text-sm text-gray-900">
                  {applicationDetails.address}<br />
                  {applicationDetails.city}, {applicationDetails.state} {applicationDetails.pincode}
                </dd>
              </div>
            )}
          </dl>
          <p className="mt-4 text-sm text-gray-600 border-t pt-4">
            To update your details, contact us at <a href="mailto:team@florus.in" className="text-[#009EE0] hover:underline">team@florus.in</a>
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-gray-600">
            Your trade account is active. Use the navigation menu to browse products, manage your cart, and view orders.
          </p>
          
          <form action={logoutAction}>
            <button
              type="submit"
              className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors"
            >
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
