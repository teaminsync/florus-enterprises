-- Enable Row Level Security on all tables
alter table categories enable row level security;
alter table products enable row level security;
alter table profiles enable row level security;
alter table trade_applications enable row level security;
alter table cart_items enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_status_history enable row level security;

-- Public read access for catalog browsing (categories + active products only)
create policy "categories are publicly readable"
  on categories for select using (true);

create policy "active products are publicly readable"
  on products for select using (is_active = true);

-- Everything else stays locked down for now — no policies granting access,
-- so only the secret-key server client (which bypasses RLS) can touch them
-- until Checkpoint 4 adds real auth-aware policies.
