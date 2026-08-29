-- RLS policies and grants for orders, order_items, and order_status_history tables
-- Trade users can only view their own orders (read-only)
-- Order creation and status changes are handled server-side via admin client

-- Policy: trade users can read their own orders
create policy "trade users read own orders"
  on orders for select
  using (auth.uid() = user_id);

-- Policy: trade users can read their own order items
create policy "trade users read own order items"
  on order_items for select
  using (
    order_id in (
      select id from orders where user_id = auth.uid()
    )
  );

-- Policy: trade users can read their own order status history
create policy "trade users read own order status history"
  on order_status_history for select
  using (
    order_id in (
      select id from orders where user_id = auth.uid()
    )
  );

-- Grant table-level access to authenticated users
-- Policies above restrict to user's own rows
grant select on public.orders to authenticated;
grant select on public.order_items to authenticated;
grant select on public.order_status_history to authenticated;

-- Grant full access to service_role for admin operations and order creation
grant select, insert, update, delete on public.orders to service_role;
grant select, insert, update, delete on public.order_items to service_role;
grant select, insert, update, delete on public.order_status_history to service_role;
