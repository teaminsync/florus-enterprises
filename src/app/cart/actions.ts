'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { requireTradeAccountReady } from '@/utils/auth/require-trade-account-ready';

export async function updateCartItemAction(cartItemId: string, quantity: number) {
  // Gate: check trade account is authenticated and password is set
  const authCheck = await requireTradeAccountReady();
  if (!authCheck.success) {
    return authCheck;
  }

  if (!cartItemId || !Number.isInteger(quantity) || quantity < 1 || quantity > 9999) {
    return { success: false, error: 'Invalid cart item or quantity' };
  }

  const supabase = await createClient();

  // Update the cart item quantity
  // RLS policy ensures user can only update their own cart items
  const { error } = await supabase
    .from('cart_items')
    .update({
      quantity,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cartItemId)
    .eq('user_id', authCheck.userId); // Extra safety check

  if (error) {
    console.error('Failed to update cart item:', error);
    return { success: false, error: 'Failed to update cart item' };
  }

  revalidatePath('/cart');
  return { success: true };
}

export async function removeCartItemAction(cartItemId: string) {
  // Gate: check trade account is authenticated and password is set
  const authCheck = await requireTradeAccountReady();
  if (!authCheck.success) {
    return authCheck;
  }

  if (!cartItemId) {
    return { success: false, error: 'Invalid cart item' };
  }

  const supabase = await createClient();

  // Delete the cart item
  // RLS policy ensures user can only delete their own cart items
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('id', cartItemId)
    .eq('user_id', authCheck.userId); // Extra safety check

  if (error) {
    console.error('Failed to remove cart item:', error);
    return { success: false, error: 'Failed to remove cart item' };
  }

  revalidatePath('/cart');
  return { success: true };
}
