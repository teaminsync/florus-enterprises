import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/utils/auth/require-role';
import { createClient } from '@/utils/supabase/server';

type Params = Promise<{ id: string }>;

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

export default async function OrderDetailPage(props: { params: Params }) {
  const params = await props.params;
  const { user } = await requireRole('trade');

  const supabase = await createClient();

  // Fetch order details
  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      id,
      status,
      po_storage_path,
      po_original_filename,
      admin_feedback,
      subtotal_ex_gst,
      gst_amount,
      total_incl_gst,
      created_at,
      updated_at
    `)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (error || !order) {
    notFound();
  }

  // Fetch order items with product details
  const { data: orderItems } = await supabase
    .from('order_items')
    .select(`
      id,
      quantity,
      unit_price_ex_gst_snapshot,
      product_id,
      products (
        name,
        pack_size
      )
    `)
    .eq('order_id', order.id);

  // Fetch status history
  const { data: statusHistory } = await supabase
    .from('order_status_history')
    .select(`
      id,
      status,
      note,
      changed_at,
      changed_by,
      profiles (
        full_name
      )
    `)
    .eq('order_id', order.id)
    .order('changed_at', { ascending: false });

  // Generate signed URL for PO download
  let poDownloadUrl: string | null = null;
  if (order.po_storage_path) {
    const { data: signedUrlData } = await supabase.storage
      .from('po-uploads')
      .createSignedUrl(order.po_storage_path, 3600); // 1 hour expiry

    poDownloadUrl = signedUrlData?.signedUrl || null;
  }

  const statusKey = order.status as keyof typeof STATUS_COLORS;
  const statusColor = STATUS_COLORS[statusKey] || 'bg-gray-100 text-gray-800';
  const statusLabel = STATUS_LABELS[statusKey] || order.status;

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/orders"
            className="text-sm text-[#009EE0] hover:underline mb-4 inline-block"
          >
            ← Back to Orders
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Order #{order.id.slice(0, 8).toUpperCase()}
              </h1>
              <p className="text-gray-600">
                Placed on{' '}
                {new Date(order.created_at).toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <span
              className={`px-4 py-2 text-sm font-medium rounded-lg border ${statusColor}`}
            >
              {statusLabel}
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Order Items */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Order Items
              </h2>

              <div className="space-y-4">
                {orderItems?.map((item) => {
                  const product = item.products as any;
                  const lineTotal =
                    item.unit_price_ex_gst_snapshot * item.quantity;

                  return (
                    <div
                      key={item.id}
                      className="flex justify-between border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{product?.name || 'Unknown Product'}</p>
                        {product?.pack_size && (
                          <p className="text-sm text-gray-500">
                            Pack Size: {product.pack_size}
                          </p>
                        )}
                        <p className="text-sm text-gray-600 mt-1">
                          Qty: {item.quantity} × ₹
                          {item.unit_price_ex_gst_snapshot.toFixed(2)} (ex-GST)
                        </p>
                      </div>
                      <p className="font-semibold text-gray-900">
                        ₹{lineTotal.toFixed(2)}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal (ex-GST)</span>
                  <span>₹{order.subtotal_ex_gst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>GST</span>
                  <span>₹{order.gst_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-300">
                  <span>Total (incl-GST)</span>
                  <span>₹{order.total_incl_gst.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Admin Feedback */}
            {order.admin_feedback && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Admin Feedback
                </h3>
                <p className="text-gray-700">{order.admin_feedback}</p>
              </div>
            )}

            {/* Status History */}
            {statusHistory && statusHistory.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Status History
                </h2>

                <div className="space-y-4">
                  {statusHistory.map((entry) => {
                    const entryProfile = entry.profiles as any;
                    return (
                      <div key={entry.id} className="flex gap-4">
                        <div className="flex-shrink-0 w-2 bg-[#009EE0] rounded"></div>
                        <div className="flex-1 pb-4">
                          <p className="font-medium text-gray-900">
                            {STATUS_LABELS[entry.status as keyof typeof STATUS_LABELS] || entry.status}
                          </p>
                          {entry.note && (
                            <p className="text-sm text-gray-600 mt-1">{entry.note}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(entry.changed_at).toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {entryProfile?.full_name && ` • ${entryProfile.full_name}`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* PO Download */}
            {poDownloadUrl && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Purchase Order
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {order.po_original_filename}
                </p>
                <a
                  href={poDownloadUrl}
                  download={order.po_original_filename}
                  className="block w-full px-4 py-2 bg-[#009EE0] text-white text-center font-medium rounded-md hover:bg-[#0088c7] transition-colors"
                >
                  Download PO
                </a>
              </div>
            )}

            {/* Order Info */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Order Information
              </h3>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-gray-500">Order ID</dt>
                  <dd className="text-gray-900 font-mono">{order.id}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Status</dt>
                  <dd className="text-gray-900">{statusLabel}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Created</dt>
                  <dd className="text-gray-900">
                    {new Date(order.created_at).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Last Updated</dt>
                  <dd className="text-gray-900">
                    {new Date(order.updated_at).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
