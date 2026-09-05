import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/utils/auth/require-role';
import { createAdminClient } from '@/utils/supabase/admin';
import { getStatusLabel, getStatusColor, ADMIN_ACTIONABLE_STATUSES } from '@/utils/orders/transitions';
import { OrderActions } from './OrderActions';

type Params = Promise<{ id: string }>;

export default async function AdminOrderDetailPage(props: { params: Params }) {
  await requireRole('admin');
  
  const params = await props.params;
  const orderId = params.id;

  const adminClient = createAdminClient();

  // Fetch order with all related data
  const { data: order, error } = await adminClient
    .from('orders')
    .select(`
      *,
      profiles!orders_user_id_fkey (
        full_name,
        account_type,
        phone
      ),
      order_items (
        id,
        quantity,
        unit_price_ex_gst_snapshot,
        products (
          name,
          composition
        )
      ),
      order_status_history (
        id,
        status,
        note,
        changed_at,
        profiles!order_status_history_changed_by_fkey (
          full_name
        )
      )
    `)
    .eq('id', orderId)
    .single();

  if (error || !order) {
    notFound();
  }

  // Fetch email from auth.users
  const { data: userData } = await adminClient.auth.admin.getUserById(order.user_id);
  const userEmail = userData.user?.email || null;

  const profile = order.profiles as any;
  const orderItems = order.order_items as any[];
  const statusHistory = (order.order_status_history as any[]).sort(
    (a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
  );

  // Get signed URLs for PO file
  let poPreviewUrl: string | null = null;
  let poDownloadUrl: string | null = null;
  
  if (order.po_storage_path) {
    const supabase = createAdminClient();
    
    // Preview URL (inline)
    const { data: previewData } = await supabase.storage
      .from('po-uploads')
      .createSignedUrl(order.po_storage_path, 3600);
    
    if (previewData) {
      poPreviewUrl = previewData.signedUrl;
    }
    
    // Download URL (force download)
    const { data: downloadData } = await supabase.storage
      .from('po-uploads')
      .createSignedUrl(order.po_storage_path, 3600, {
        download: order.po_original_filename,
      });
    
    if (downloadData) {
      poDownloadUrl = downloadData.signedUrl;
    }
  }

  // Determine file type from filename
  const isImageFile = order.po_original_filename
    ? /\.(jpe?g|png|gif|webp)$/i.test(order.po_original_filename)
    : false;
  const isPdfFile = order.po_original_filename
    ? /\.pdf$/i.test(order.po_original_filename)
    : false;

  // Check what actions are available for this order's current status
  const availableActions = ADMIN_ACTIONABLE_STATUSES[order.status as keyof typeof ADMIN_ACTIONABLE_STATUSES] || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/orders"
            className="text-[#009EE0] hover:text-[#0088c7] font-medium inline-block mb-4"
          >
            ← Back to Orders
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Order {order.id.substring(0, 8)}...
              </h1>
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(
                    order.status
                  )}`}
                >
                  {getStatusLabel(order.status)}
                </span>
                <span className="text-sm text-gray-500">
                  Submitted {new Date(order.created_at).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Customer Information</h2>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-500">Name:</span>{' '}
                  <span className="text-sm font-medium text-gray-900">{profile.full_name}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Email:</span>{' '}
                  <span className="text-sm font-medium text-gray-900">{userEmail}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Phone:</span>{' '}
                  <span className="text-sm font-medium text-gray-900">{profile.phone}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Account Type:</span>{' '}
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {profile.account_type}
                  </span>
                </div>
              </div>
            </div>

            {/* Order items */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Order Items</h2>
              <div className="space-y-4">
                {orderItems.map((item) => {
                  const product = item.products as any;
                  const lineTotal = item.quantity * item.unit_price_ex_gst_snapshot;
                  
                  return (
                    <div key={item.id} className="flex justify-between items-start pb-4 border-b last:border-0">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{product.name}</h3>
                        <p className="text-sm text-gray-500">{product.composition}</p>
                        <div className="mt-2 text-sm text-gray-600">
                          <span>Qty: {item.quantity}</span>
                          <span className="mx-2">×</span>
                          <span>₹{item.unit_price_ex_gst_snapshot.toFixed(2)} (ex-GST)</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">
                          ₹{lineTotal.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">ex-GST</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Order totals */}
              <div className="mt-6 pt-6 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal (ex-GST):</span>
                  <span className="font-medium text-gray-900">
                    ₹{order.subtotal_ex_gst.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">GST:</span>
                  <span className="font-medium text-gray-900">
                    ₹{order.gst_amount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                  <span className="text-gray-900">Total (incl-GST):</span>
                  <span className="text-gray-900">₹{order.total_incl_gst.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* PO preview and download */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Purchase Order</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {order.po_original_filename}
                    </p>
                    <p className="text-xs text-gray-500">
                      Uploaded {new Date(order.created_at).toLocaleString('en-IN')}
                    </p>
                  </div>
                  {poDownloadUrl && (
                    <a
                      href={poDownloadUrl}
                      className="inline-flex items-center px-4 py-2 bg-[#009EE0] text-white text-sm font-medium rounded-md hover:bg-[#0088c7] transition-colors"
                    >
                      Download PO
                    </a>
                  )}
                </div>

                {/* Preview */}
                {poPreviewUrl && (
                  <div className="border rounded-lg overflow-hidden bg-gray-50">
                    {isImageFile ? (
                      <img
                        src={poPreviewUrl}
                        alt="Purchase Order"
                        className="max-w-full h-auto"
                      />
                    ) : isPdfFile ? (
                      <iframe
                        src={poPreviewUrl}
                        className="w-full h-[600px] border-0"
                        title="Purchase Order Preview"
                      />
                    ) : (
                      <div className="p-8 text-center text-gray-500">
                        <p>Preview not available for this file type.</p>
                        <p className="text-sm mt-2">Please download the file to view it.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Status history */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Status History</h2>
              <div className="space-y-4">
                {statusHistory.map((entry) => {
                  const changedBy = entry.profiles as any;
                  return (
                    <div key={entry.id} className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div
                          className={`w-2 h-2 mt-1.5 rounded-full ${
                            entry.status === 'pending_verification'
                              ? 'bg-yellow-400'
                              : entry.status === 'approved'
                              ? 'bg-green-400'
                              : entry.status === 'rejected'
                              ? 'bg-red-400'
                              : entry.status === 'needs_revision'
                              ? 'bg-orange-400'
                              : 'bg-blue-400'
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded ${getStatusColor(
                              entry.status
                            )}`}
                          >
                            {getStatusLabel(entry.status)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(entry.changed_at).toLocaleString('en-IN')}
                          </span>
                        </div>
                        {entry.note && (
                          <p className="text-sm text-gray-700 mt-1">{entry.note}</p>
                        )}
                        {changedBy && (
                          <p className="text-xs text-gray-500 mt-1">by {changedBy.full_name}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar - Actions */}
          <div className="space-y-6">
            {/* Admin feedback display */}
            {order.admin_feedback && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-amber-900 mb-2">Admin Feedback</h3>
                <p className="text-sm text-amber-800">{order.admin_feedback}</p>
              </div>
            )}

            {/* Action controls */}
            {availableActions.length > 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Actions</h2>
                <OrderActions orderId={order.id} currentStatus={order.status} />
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Status</h2>
                <p className="text-sm text-gray-600">
                  {order.status === 'needs_revision'
                    ? 'Awaiting resubmission from trade user.'
                    : order.status === 'rejected'
                    ? 'This order has been rejected.'
                    : order.status === 'fulfilled'
                    ? 'This order has been fulfilled.'
                    : 'No actions available.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
