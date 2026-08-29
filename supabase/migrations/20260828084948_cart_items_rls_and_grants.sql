-- RLS policies and grants for cart_items table
-- Trade users can manage their own cart items

-- Create policy: trade users can manage their own cart
create policy "trade users manage own cart"
  on cart_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Grant table-level access to authenticated users
-- Policy above restricts to user's own rows
grant select, insert, update, delete on public.cart_items to authenticated;

-- Grant full access to service_role for admin operations and testing
grant select, insert, update, delete on public.cart_items to service_role;
