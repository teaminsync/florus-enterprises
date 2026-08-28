import Link from 'next/link';
import { requireRole } from '@/utils/auth/require-role';
import { createAdminClient } from '@/utils/supabase/admin';
import { logoutAction } from '../trade/dashboard/actions';

export default async function AdminDashboardPage() {
  // Require admin role
  const { user, profile } = await requireRole('admin');

  // Get pending applications count using admin client
  const adminClient = createAdminClient();
  const { count } = await adminClient
    .from('trade_applications')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 py-16 max-w-6xl">
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
              className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 transition-colors"
            >
              Sign Out
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Pending Applications Card */}
          <Link
            href="/admin/applications"
            className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-[#009EE0] hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Pending Applications
              </h2>
              {count && count > 0 && (
                <span className="inline-flex items-center justify-center w-8 h-8 bg-red-100 text-red-600 text-sm font-bold rounded-full">
                  {count}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">
              Review and approve trade account applications
            </p>
          </Link>

          {/* All Applications Card */}
          <Link
            href="/admin/applications"
            className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-[#009EE0] hover:shadow-md transition-all"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              All Applications
            </h2>
            <p className="text-sm text-gray-600">
              View all trade applications and their status
            </p>
          </Link>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Logged in as</h3>
          <p className="text-gray-900">{user.email}</p>
        </div>
      </div>
    </div>
  );
}
