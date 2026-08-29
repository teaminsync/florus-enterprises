import Link from 'next/link';
import { requireRole } from '@/utils/auth/require-role';
import { createClient } from '@/utils/supabase/server';
import { calculateTradePrice, calculateGstAmount } from '@/utils/pricing';
import { CartItemRow } from './CartItemRow';

export default async function CartPage() {
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

  // Calculate totals
  let subtotalExGst = 0;
  let totalGst = 0;

  const itemsWithPricing = validCartItems.map((item) => {
    const product = item.products as any;
    
    // Skip items with null SP (upcoming products)
    if (product.sp === null) {
      return {
        ...item,
        product,
        hasPrice: false,
        unitPriceExGst: 0,
        lineSubtotalExGst: 0,
        lineGst: 0,
        lineTotalInclGst: 0,
      };
    }

    const unitPriceExGst = calculateTradePrice(product.sp);
    const lineSubtotalExGst = Math.round(unitPriceExGst * item.quantity * 100) / 100;
    const lineGst = calculateGstAmount(lineSubtotalExGst, product.gst_percent);
    const lineTotalInclGst = lineSubtotalExGst + lineGst;

    subtotalExGst += lineSubtotalExGst;
    totalGst += lineGst;

    return {
      ...item,
      product,
      hasPrice: true,
      unitPriceExGst,
      lineSubtotalExGst,
      lineGst,
      lineTotalInclGst,
    };
  });

  const totalInclGst = subtotalExGst + totalGst;

  // Check if any items don't have pricing
  const hasUnpricedItems = itemsWithPricing.some((item) => !item.hasPrice);

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Your Cart</h1>
          <p className="text-gray-600">
            Review your items and proceed to checkout when ready.
          </p>
        </div>

        {validCartItems.length === 0 ? (
          /* Empty cart */
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500 mb-4">Your cart is empty</p>
            <Link
              href="/medicines"
              className="inline-block px-6 py-3 bg-[#009EE0] text-white font-medium rounded-md hover:bg-[#0088c7] transition-colors"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {itemsWithPricing.map((item) => (
                <CartItemRow
                  key={item.id}
                  cartItemId={item.id}
                  product={item.product}
                  quantity={item.quantity}
                  hasPrice={item.hasPrice}
                  unitPriceExGst={item.unitPriceExGst}
                  lineSubtotalExGst={item.lineSubtotalExGst}
                />
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-gray-50 rounded-lg p-6 sticky top-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Order Summary
                </h2>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal (ex-GST)</span>
                    <span>₹{subtotalExGst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>GST</span>
                    <span>₹{totalGst.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between text-lg font-semibold text-gray-900">
                      <span>Total (incl-GST)</span>
                      <span>₹{totalInclGst.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {hasUnpricedItems && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <p className="text-sm text-amber-800">
                      Some items in your cart do not have pricing available and will
                      need to be removed before checkout.
                    </p>
                  </div>
                )}

                {validCartItems.length > 0 && !hasUnpricedItems ? (
                  <Link
                    href="/checkout"
                    className="block w-full px-6 py-3 bg-[#009EE0] text-white font-medium text-center rounded-md hover:bg-[#0088c7] transition-colors"
                  >
                    Proceed to Checkout
                  </Link>
                ) : (
                  <button
                    disabled
                    className="block w-full px-6 py-3 bg-gray-300 text-gray-500 font-medium text-center rounded-md cursor-not-allowed"
                  >
                    {hasUnpricedItems
                      ? 'Remove unpriced items to continue'
                      : 'Cart is empty'}
                  </button>
                )}

                <Link
                  href="/medicines"
                  className="block w-full mt-3 px-6 py-3 border border-gray-300 text-gray-700 font-medium text-center rounded-md hover:bg-gray-50 transition-colors"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
