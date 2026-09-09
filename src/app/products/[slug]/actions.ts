'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { requireTradeAccountReady } from '@/utils/auth/require-trade-account-ready';

export async function addToCartAction(formData: FormData) {
  const productId = formData.get('productId') as string;
  const quantity = parseInt(formData.get('quantity') as string, 10);

  if (!productId || isNaN(quantity) || quantity < 1) {
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

  // 3. Upsert into cart_items (increment quantity if already exists)
  const { error: upsertError } = await supabase
    .from('cart_items')
    .upsert(
      {
        user_id: authCheck.userId,
        product_id: productId,
        quantity: quantity,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,product_id',
        // When conflict, increment the existing quantity
        ignoreDuplicates: false,
      }
    );

  if (upsertError) {
    console.error('Failed to add to cart:', upsertError);
    return { success: false, error: 'Failed to add item to cart' };
  }

  // Revalidate the cart page
  revalidatePath('/cart');

  return { success: true, message: 'Item added to cart' };
}
