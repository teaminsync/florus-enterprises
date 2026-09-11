import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/utils/auth/require-role';
import { createAdminClient } from '@/utils/supabase/admin';
import { ApproveButton } from './ApproveButton';
import { RejectButton } from './RejectButton';

type Params = Promise<{ id: string }>;

export default async function ApplicationDetailPage(props: { params: Params }) {
  const params = await props.params;
  
  // Require admin role
  const { user: adminUser } = await requireRole('admin');

  // Get application details using admin client
  const adminClient = createAdminClient();
  const { data: application, error } = await adminClient
    .from('trade_applications')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !application) {
    notFound();
  }

  const isPending = application.status === 'pending';

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <Link
            href="/admin/applications"
            className="text-[#009EE0] hover:text-[#0088c7] font-medium inline-block mb-4"
          >
            ← Back to Applications
          </Link>
          <h1 className="text-4xl font-bold text-gray-900">
            Application Details
          </h1>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
          {/* Status Banner */}
          <div className={`px-6 py-4 ${
            application.status === 'pending' ? 'bg-yellow-50' :
            application.status === 'approved' ? 'bg-green-50' :
            'bg-red-50'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">Status: </span>
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                  application.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  application.status === 'approved' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {application.status}
                </span>
              </div>
              {application.reviewed_at && (
                <div className="text-sm text-gray-600">
                  Reviewed on {new Date(application.reviewed_at).toLocaleString()}
                </div>
              )}
            </div>
          </div>

          {/* Application Details */}
          <div className="px-6 py-6">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <dt className="text-sm font-medium text-gray-500 mb-1">Full Name</dt>
                <dd className="text-base text-gray-900">{application.full_name}</dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500 mb-1">Applicant Type</dt>
                <dd className="text-base text-gray-900 capitalize">{application.applicant_type}</dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500 mb-1">Email</dt>
                <dd className="text-base text-gray-900">{application.email}</dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500 mb-1">Phone</dt>
                <dd className="text-base text-gray-900">{application.phone}</dd>
              </div>

              {application.business_or_clinic_name && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">
                    {application.applicant_type === 'doctor' ? 'Clinic Name' : 
                     application.applicant_type === 'hospital' ? 'Institution Name' : 
                     'Business Name'}
                  </dt>
                  <dd className="text-base text-gray-900">{application.business_or_clinic_name}</dd>
                </div>
              )}

              {application.registration_number && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">Registration Number</dt>
                  <dd className="text-base text-gray-900">{application.registration_number}</dd>
                </div>
              )}

              {application.licence_number && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">Licence Number</dt>
                  <dd className="text-base text-gray-900">{application.licence_number}</dd>
                </div>
              )}

              {application.gst_number && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">GST No.</dt>
                  <dd className="text-base text-gray-900">{application.gst_number}</dd>
                </div>
              )}

              {application.authorized_signatory && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">Authorized Signatory</dt>
                  <dd className="text-base text-gray-900">{application.authorized_signatory}</dd>
                </div>
              )}

              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-gray-500 mb-1">Address</dt>
                <dd className="text-base text-gray-900">
                  {application.address}<br />
                  {application.city}, {application.state} {application.pincode}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500 mb-1">Submitted On</dt>
                <dd className="text-base text-gray-900">
                  {new Date(application.created_at).toLocaleString()}
                </dd>
              </div>
            </dl>

            {application.admin_notes && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <dt className="text-sm font-medium text-gray-500 mb-1">Admin Notes</dt>
                <dd className="text-base text-gray-900">{application.admin_notes}</dd>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {isPending && (
          <div className="flex gap-4">
            <div className="flex-1">
              <ApproveButton 
                applicationId={application.id}
                adminUserId={adminUser.id}
              />
            </div>

            <div className="flex-1">
              <RejectButton 
                applicationId={application.id}
                adminUserId={adminUser.id}
              />
            </div>
          </div>
        )}

        {!isPending && (
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              This application has already been {application.status}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
