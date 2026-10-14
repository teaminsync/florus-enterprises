'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { requireTradeAccountReady } from '@/utils/auth/require-trade-account-ready';

export async function addToCartAction(formData: FormData) {
  const productId = formData.get('productId') as string;
  const quantity = parseInt(formData.get('quantity') as string, 10);

  if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > 9999) {
    return { success: false, error: 'Invalid product or quantity' };
  }

  // Check trade account is authenticated and password is set
  const authCheck = await requireTradeAccountReady();
  if (!authCheck.success) {
    return authCheck;
  }

  const supabase = await createClient();

  // 2. Verify product exists and has a price
  const { data: product } = await supabase
    .from('products')
    .select('id, name, sp, is_active')
    .eq('id', productId)
    .single();

  if (!product || !product.is_active) {
    return { success: false, error: 'Product not found or is inactive' };
  }

  if (product.sp === null) {
    return { success: false, error: 'This product does not have pricing available yet' };
  }

  // Read current cart quantity to increment instead of replace
  const { data: existing, error: readError } = await supabase
    .from('cart_items')
    .select('quantity')
    .eq('user_id', authCheck.userId)
    .eq('product_id', productId)
    .maybeSingle();

  if (readError) {
    console.error('Failed to read cart item:', readError);
    return { success: false, error: 'Failed to add item to cart' };
  }

  const existingQty = existing?.quantity ?? 0;
  const newQty = existingQty + quantity;

  // Check per-item maximum
  if (newQty > 9999) {
    return {
      success: false,
      error: `You already have ${existingQty} of this item in your cart. The maximum per item is 9999.`,
    };
  }

  // Upsert with the new total quantity
  const { error: upsertError } = await supabase
    .from('cart_items')
    .upsert(
      {
        user_id: authCheck.userId,
        product_id: productId,
        quantity: newQty,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,product_id',
        ignoreDuplicates: false,
      }
    );

  if (upsertError) {
    console.error('Failed to add to cart:', upsertError);
    return { success: false, error: 'Failed to add item to cart' };
  }

  // Revalidate the cart page
  revalidatePath('/cart');

  return {
    success: true,
    message: existingQty > 0 ? `Added to cart. You now have ${newQty} in your cart.` : 'Item added to cart',
  };
}
