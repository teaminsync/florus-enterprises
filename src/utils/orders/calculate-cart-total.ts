import { createAdminClient } from '@/utils/supabase/admin';
import { calculateTradePrice, calculateGstAmount } from '@/utils/pricing';

export type CartItem = {
  id: string;
  quantity: number;
  product_id: string;
  products: {
    id: string;
    name: string;
    sp: number | null;
    gst_percent: number;
    is_active: boolean;
  };
};

export type CartTotals = {
  subtotalExGst: number;
  gstAmount: number;
  totalInclGst: number;
  orderItems: Array<{
    product_id: string;
    quantity: number;
    unit_price_ex_gst_snapshot: number;
  }>;
};

export type CalculateCartTotalResult =
  | { success: true; totals: CartTotals; cartItems: CartItem[] }
  | { success: false; error: string };

/**
 * Fetch cart items and calculate totals server-side.
 * CRITICAL: This is the single source of truth for order amounts.
 * Used by both COD and online payment flows to ensure consistency.
 */
export async function calculateCartTotal(userId: string): Promise<CalculateCartTotalResult> {
  const adminClient = createAdminClient();

  // Fetch cart items with current product prices
  const { data: cartItems, error: cartError } = await adminClient
    .from('cart_items')
    .select(`
      id,
      quantity,
      product_id,
      products (
        id,
        name,
        sp,
        gst_percent,
        is_active
      )
    `)
    .eq('user_id', userId);

  if (cartError || !cartItems || cartItems.length === 0) {
    return { success: false, error: 'Your cart is empty' };
  }

  // Validate all products have pricing and are active
  const invalidItems: string[] = [];
  
  for (const item of cartItems) {
    const product = item.products as any;
    
    if (!product || !product.is_active) {
      invalidItems.push('Inactive product in cart');
    } else if (product.sp === null) {
      invalidItems.push(`${product.name} does not have pricing available`);
    }
  }

  if (invalidItems.length > 0) {
    return {
      success: false,
      error: `Cannot proceed: ${invalidItems.join(', ')}. Please remove these items from your cart.`,
    };
  }

  // Calculate order totals from current prices
  let subtotalExGst = 0;
  let totalGstAmount = 0;
  const orderItems: Array<{
    product_id: string;
    quantity: number;
    unit_price_ex_gst_snapshot: number;
  }> = [];

  for (const item of cartItems) {
    const product = item.products as any;
    const unitPriceExGst = calculateTradePrice(product.sp);
    const lineSubtotalExGst = Math.round(unitPriceExGst * item.quantity * 100) / 100;
    const lineGst = calculateGstAmount(lineSubtotalExGst, product.gst_percent);

    subtotalExGst += lineSubtotalExGst;
    totalGstAmount += lineGst;

    orderItems.push({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price_ex_gst_snapshot: unitPriceExGst,
    });
  }

  // Round total GST to 2 decimal places
  const gstAmount = Math.round(totalGstAmount * 100) / 100;
  const totalInclGst = subtotalExGst + gstAmount;

  // Type assertion to handle Supabase's array return type for single relations
  const typedCartItems = cartItems.map(item => ({
    ...item,
    products: Array.isArray(item.products) ? item.products[0] : item.products,
  })) as CartItem[];

  return {
    success: true,
    totals: {
      subtotalExGst,
      gstAmount,
      totalInclGst,
      orderItems,
    },
    cartItems: typedCartItems,
  };
}
