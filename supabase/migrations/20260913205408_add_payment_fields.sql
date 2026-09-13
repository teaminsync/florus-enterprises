-- Add payment-related fields to orders table for Razorpay integration
alter table orders add column payment_method text not null default 'cod' check (payment_method in ('cod', 'online'));
alter table orders add column razorpay_order_id text;
alter table orders add column razorpay_payment_id text;
alter table orders add column payment_status text check (payment_status in ('captured', 'refund_initiated', 'refunded', 'refund_failed'));
alter table orders add column razorpay_refund_id text;
