-- Add unique partial indexes to prevent payment ID reuse
-- Partial indexes (where not null) allow rows with null values while enforcing uniqueness for non-null values

create unique index if not exists orders_razorpay_payment_id_key 
  on orders (razorpay_payment_id) 
  where razorpay_payment_id is not null;

create unique index if not exists orders_razorpay_order_id_key 
  on orders (razorpay_order_id) 
  where razorpay_order_id is not null;
