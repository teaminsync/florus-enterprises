-- Ledger of automatic refunds for cart-changed-during-payment scenarios
-- Used by the webhook orphan check to skip alerts without calling Razorpay API

create table public.auto_refunds (
  razorpay_payment_id text primary key,
  razorpay_order_id text,
  razorpay_refund_id text,
  user_id uuid,
  amount_paise integer not null,
  reason text not null default 'cart_changed_during_payment',
  created_at timestamptz not null default now()
);

alter table public.auto_refunds enable row level security;

grant select, insert on public.auto_refunds to service_role;
