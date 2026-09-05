import Link from 'next/link';
import { requireRole } from '@/utils/auth/require-role';
import { createClient } from '@/utils/supabase/server';

const STATUS_COLORS = {
  pending_verification: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  needs_revision: 'bg-orange-100 text-orange-800 border-orange-200',
  fulfilled: 'bg-blue-100 text-blue-800 border-blue-200',
};

const STATUS_LABELS = {
  pending_verification: 'Pending Verification',
  approved: 'Approved',
  rejected: 'Rejected',
  needs_revision: 'Needs Revision',
  fulfilled: 'Fulfilled',
};

export default async function OrdersPage() {
  // Require trade role
  const { user } = await requireRole('trade');

  const supabase = await createClient();

  // Fetch user's orders
  const { data: orders } = await supabase
    .from('orders')
    .select('id, status, total_incl_gst, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Orders</h1>
          <p className="text-gray-600">
            View and track your order history.
          </p>
        </div>

        {!orders || orders.length === 0 ? (
          /* No orders yet */
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500 mb-4">You haven't placed any orders yet</p>
            <Link
              href="/medicines"
              className="inline-block px-6 py-3 bg-[#009EE0] text-white font-medium rounded-md hover:bg-[#0088c7] transition-colors"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          /* Orders list */
          <div className="space-y-6">
            {orders.map((order) => {
              const statusKey = order.status as keyof typeof STATUS_COLORS;
              const statusColor = STATUS_COLORS[statusKey] || 'bg-gray-100 text-gray-800';
              const statusLabel = STATUS_LABELS[statusKey] || order.status;

              return (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="block bg-white border border-gray-200 rounded-lg p-6 hover:border-[#009EE0] hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Order #{order.id.slice(0, 8).toUpperCase()}
                        </h3>
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded-full border ${statusColor}`}
                        >
                          {statusLabel}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        Placed on{' '}
                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-gray-500 mb-1">Total</p>
                      <p className="text-2xl font-bold text-gray-900">
                        ₹{order.total_incl_gst.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <span className="text-sm text-[#009EE0] font-medium">
                      View Details →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
