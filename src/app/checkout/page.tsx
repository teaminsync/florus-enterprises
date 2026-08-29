import { redirect } from 'next/navigation';
import { requireRole } from '@/utils/auth/require-role';
import { createClient } from '@/utils/supabase/server';
import { calculateTradePrice, calculateGstAmount } from '@/utils/pricing';
import { CheckoutForm } from './CheckoutForm';

export default async function CheckoutPage() {
  // Require trade role
  const { user } = await requireRole('trade');

  const supabase = await createClient();

  // Fetch cart items with product details
  const { data: cartItems } = await supabase
    .from('cart_items')
    .select(`
      id,
      quantity,
      product_id,
      products (
        id,
        name,
        slug,
        sp,
        gst_percent,
        pack_size,
        is_active
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  // Filter out any items where product no longer exists or is inactive
  const validCartItems = (cartItems || []).filter(
    (item) => item.products && (item.products as any).is_active
  );

  // Redirect to cart if empty
  if (validCartItems.length === 0) {
    redirect('/cart');
  }

  // Calculate totals and check for unpriced items
  let subtotalExGst = 0;
  let totalGst = 0;
  let hasUnpricedItems = false;

  const itemsWithPricing = validCartItems.map((item) => {
    const product = item.products as any;
    
    // Check for null SP (upcoming products)
    if (product.sp === null) {
      hasUnpricedItems = true;
      return {
        ...item,
        product,
        hasPrice: false,
        unitPriceExGst: 0,
        lineSubtotalExGst: 0,
        lineGst: 0,
      };
    }

    const unitPriceExGst = calculateTradePrice(product.sp);
    const lineSubtotalExGst = Math.round(unitPriceExGst * item.quantity * 100) / 100;
    const lineGst = calculateGstAmount(lineSubtotalExGst, product.gst_percent);

    subtotalExGst += lineSubtotalExGst;
    totalGst += lineGst;

    return {
      ...item,
      product,
      hasPrice: true,
      unitPriceExGst,
      lineSubtotalExGst,
      lineGst,
    };
  });

  const totalInclGst = subtotalExGst + totalGst;

  // Redirect back to cart if there are unpriced items
  if (hasUnpricedItems) {
    redirect('/cart');
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Checkout</h1>
          <p className="text-gray-600">
            Review your order and upload your purchase order to complete.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Order Summary */}
          <div className="lg:col-span-2">
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Order Summary
              </h2>

              <div className="space-y-3 mb-4">
                {itemsWithPricing.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between text-sm border-b border-gray-200 pb-3"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.product.name}</p>
                      <p className="text-gray-500">
                        Qty: {item.quantity} × ₹{item.unitPriceExGst.toFixed(2)}
                      </p>
                    </div>
                    <p className="font-semibold text-gray-900">
                      ₹{item.lineSubtotalExGst.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-4 border-t border-gray-300">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal (ex-GST)</span>
                  <span>₹{subtotalExGst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>GST</span>
                  <span>₹{totalGst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-300">
                  <span>Total (incl-GST)</span>
                  <span>₹{totalInclGst.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* PO Upload Form */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Purchase Order
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Please upload your official purchase order document (PDF, JPG, or PNG).
                This is required to process your order.
              </p>

              <CheckoutForm userId={user.id} />
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="lg:col-span-1">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 sticky top-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                What happens next?
              </h3>
              <ol className="space-y-3 text-sm text-gray-700">
                <li className="flex gap-2">
                  <span className="font-semibold text-blue-600">1.</span>
                  <span>Your order will be submitted for verification</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-blue-600">2.</span>
                  <span>Our team will review your PO and order details</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-blue-600">3.</span>
                  <span>You'll receive confirmation once approved</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-blue-600">4.</span>
                  <span>Your order will be processed and dispatched</span>
                </li>
              </ol>

              <div className="mt-6 pt-6 border-t border-blue-200">
                <p className="text-xs text-gray-600">
                  <strong>Note:</strong> All prices shown are trade prices and exclude
                  any applicable delivery charges. Final invoice will include all
                  applicable taxes and fees.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
