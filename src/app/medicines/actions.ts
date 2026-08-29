'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';

export async function quickAddToCartAction(productId: string) {
  if (!productId) {
    return { success: false, error: 'Invalid product' };
  }

  const supabase = await createClient();

  // 1. Verify user is authenticated and has trade role
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'You must be logged in' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'trade') {
    return { success: false, error: 'Only trade accounts can add items to cart' };
  }

  // 2. Verify product exists and has a price
  const { data: product } = await supabase
    .from('products')
    .select('sp, is_active')
    .eq('id', productId)
    .single();

  if (!product || !product.is_active) {
    return { success: false, error: 'Product not found or is inactive' };
  }

  if (product.sp === null) {
    return { success: false, error: 'This product does not have pricing available yet' };
  }

  // 3. Upsert into cart_items with quantity 1
  const { error: upsertError } = await supabase
    .from('cart_items')
    .upsert(
      {
        user_id: user.id,
        product_id: productId,
        quantity: 1,
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

  revalidatePath('/cart');

  return { success: true };
}
