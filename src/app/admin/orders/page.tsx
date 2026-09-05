import Link from 'next/link';
import { requireRole } from '@/utils/auth/require-role';
import { createAdminClient } from '@/utils/supabase/admin';
import { getStatusLabel, getStatusColor } from '@/utils/orders/transitions';

type SearchParams = Promise<{ status?: string }>;

export default async function AdminOrdersPage(props: { searchParams: SearchParams }) {
  await requireRole('admin');
  
  const searchParams = await props.searchParams;
  const statusFilter = searchParams.status;

  const adminClient = createAdminClient();

  // Get status counts
  const { data: statusCounts } = await adminClient
    .from('orders')
    .select('status')
    .then((result) => {
      if (result.error || !result.data) return { data: null };
      
      const counts: Record<string, number> = {
        pending_verification: 0,
        approved: 0,
        rejected: 0,
        needs_revision: 0,
        fulfilled: 0,
      };
      
      result.data.forEach((order) => {
        if (order.status in counts) {
          counts[order.status]++;
        }
      });
      
      return { data: counts };
    });

  // Build orders query
  let ordersQuery = adminClient
    .from('orders')
    .select(`
      id,
      user_id,
      status,
      total_incl_gst,
      created_at,
      profiles!orders_user_id_fkey (
        full_name,
        account_type
      )
    `)
    .order('created_at', { ascending: false });

  // Apply status filter if present
  if (statusFilter) {
    ordersQuery = ordersQuery.eq('status', statusFilter);
  }

  const { data: orders } = await ordersQuery;

  // Fetch emails from auth.users for each order
  const ordersWithEmail = orders ? await Promise.all(
    orders.map(async (order) => {
      const { data: userData } = await adminClient.auth.admin.getUserById(order.user_id);
      return {
        ...order,
        userEmail: userData.user?.email || null,
      };
    })
  ) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-4xl font-bold text-gray-900">Order Management</h1>
            <Link
              href="/admin"
              className="text-[#009EE0] hover:text-[#0088c7] font-medium"
            >
              ← Back to Dashboard
            </Link>
          </div>

          {/* Status summary */}
          {statusCounts && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/admin/orders"
                  className={`text-sm px-3 py-1 rounded-full ${
                    !statusFilter
                      ? 'bg-gray-200 text-gray-900 font-medium'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All Orders ({Object.values(statusCounts).reduce((a, b) => a + b, 0)})
                </Link>
                <Link
                  href="/admin/orders?status=pending_verification"
                  className={`text-sm px-3 py-1 rounded-full ${
                    statusFilter === 'pending_verification'
                      ? 'bg-yellow-200 text-yellow-900 font-medium'
                      : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                  }`}
                >
                  Pending ({statusCounts.pending_verification})
                </Link>
                <Link
                  href="/admin/orders?status=needs_revision"
                  className={`text-sm px-3 py-1 rounded-full ${
                    statusFilter === 'needs_revision'
                      ? 'bg-orange-200 text-orange-900 font-medium'
                      : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                  }`}
                >
                  Needs Revision ({statusCounts.needs_revision})
                </Link>
                <Link
                  href="/admin/orders?status=approved"
                  className={`text-sm px-3 py-1 rounded-full ${
                    statusFilter === 'approved'
                      ? 'bg-green-200 text-green-900 font-medium'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  Approved ({statusCounts.approved})
                </Link>
                <Link
                  href="/admin/orders?status=fulfilled"
                  className={`text-sm px-3 py-1 rounded-full ${
                    statusFilter === 'fulfilled'
                      ? 'bg-blue-200 text-blue-900 font-medium'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  Fulfilled ({statusCounts.fulfilled})
                </Link>
                <Link
                  href="/admin/orders?status=rejected"
                  className={`text-sm px-3 py-1 rounded-full ${
                    statusFilter === 'rejected'
                      ? 'bg-red-200 text-red-900 font-medium'
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}
                >
                  Rejected ({statusCounts.rejected})
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Orders table */}
        {ordersWithEmail && ordersWithEmail.length > 0 ? (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ordersWithEmail.map((order) => {
                  const profile = order.profiles as any;
                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono text-gray-900">
                          {order.id.substring(0, 8)}...
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{profile?.full_name}</div>
                        <div className="text-sm text-gray-500">{order.userEmail}</div>
                        <div className="text-xs text-gray-400 capitalize">
                          {profile?.account_type}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {getStatusLabel(order.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">
                          ₹{order.total_incl_gst.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500">
                          {new Date(order.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="text-[#009EE0] hover:text-[#0088c7] font-medium text-sm"
                        >
                          Review →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500">
              {statusFilter
                ? `No orders with status "${getStatusLabel(statusFilter)}"`
                : 'No orders yet'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
