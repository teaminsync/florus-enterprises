import Link from 'next/link';
import { requireRole } from '@/utils/auth/require-role';
import { createAdminClient } from '@/utils/supabase/admin';
import { logoutAction } from '../trade/dashboard/actions';

export default async function AdminDashboardPage() {
  // Require admin role
  const { user, profile } = await requireRole('admin');

  // Get pending applications count using admin client
  const adminClient = createAdminClient();
  const { count: pendingApplications } = await adminClient
    .from('trade_applications')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  // Get pending orders count
  const { count: pendingOrders } = await adminClient
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending_verification');

  // Get orders needing revision count
  const { count: needsRevisionOrders } = await adminClient
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'needs_revision');

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Admin Dashboard
            </h1>
            <p className="text-gray-600">
              Welcome, {profile.full_name}
            </p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors"
            >
              Sign Out
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Pending Orders Card */}
          <Link
            href="/admin/orders?status=pending_verification"
            className="bg-white border border-gray-200 rounded-lg p-6 hover:border-[#009EE0] hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Pending Orders
              </h2>
              {pendingOrders && pendingOrders > 0 && (
                <span className="inline-flex items-center justify-center w-8 h-8 bg-yellow-100 text-yellow-700 text-sm font-bold rounded-full">
                  {pendingOrders}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">
              Orders awaiting verification
            </p>
          </Link>

          {/* Orders Needing Revision Card */}
          <Link
            href="/admin/orders?status=needs_revision"
            className="bg-white border border-gray-200 rounded-lg p-6 hover:border-[#009EE0] hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Awaiting Resubmission
              </h2>
              {needsRevisionOrders && needsRevisionOrders > 0 && (
                <span className="inline-flex items-center justify-center w-8 h-8 bg-orange-100 text-orange-700 text-sm font-bold rounded-full">
                  {needsRevisionOrders}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">
              Orders sent back for revision
            </p>
          </Link>

          {/* All Orders Card */}
          <Link
            href="/admin/orders"
            className="bg-white border border-gray-200 rounded-lg p-6 hover:border-[#009EE0] hover:shadow-md transition-all"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              All Orders
            </h2>
            <p className="text-sm text-gray-600">
              View and manage all trade orders
            </p>
          </Link>

          {/* Pending Applications Card */}
          <Link
            href="/admin/applications"
            className="bg-white border border-gray-200 rounded-lg p-6 hover:border-[#009EE0] hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Pending Applications
              </h2>
              {pendingApplications && pendingApplications > 0 && (
                <span className="inline-flex items-center justify-center w-8 h-8 bg-red-100 text-red-700 text-sm font-bold rounded-full">
                  {pendingApplications}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">
              Review and approve trade account applications
            </p>
          </Link>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Logged in as
          </h3>
          <p className="text-gray-900">{user.email}</p>
        </div>
      </div>
    </div>
  );
}
