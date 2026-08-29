'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';

export async function updateCartItemAction(cartItemId: string, quantity: number) {
  if (!cartItemId || quantity < 1) {
    return { success: false, error: 'Invalid cart item or quantity' };
  }

  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'You must be logged in' };
  }

  // Update the cart item quantity
  // RLS policy ensures user can only update their own cart items
  const { error } = await supabase
    .from('cart_items')
    .update({
      quantity,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cartItemId)
    .eq('user_id', user.id); // Extra safety check

  if (error) {
    console.error('Failed to update cart item:', error);
    return { success: false, error: 'Failed to update cart item' };
  }

  revalidatePath('/cart');
  return { success: true };
}

export async function removeCartItemAction(cartItemId: string) {
  if (!cartItemId) {
    return { success: false, error: 'Invalid cart item' };
  }

  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'You must be logged in' };
  }

  // Delete the cart item
  // RLS policy ensures user can only delete their own cart items
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('id', cartItemId)
    .eq('user_id', user.id); // Extra safety check

  if (error) {
    console.error('Failed to remove cart item:', error);
    return { success: false, error: 'Failed to remove cart item' };
  }

  revalidatePath('/cart');
  return { success: true };
}
