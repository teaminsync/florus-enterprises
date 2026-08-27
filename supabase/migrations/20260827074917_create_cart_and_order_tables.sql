-- Create cart_items table
create table cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  product_id uuid not null references products(id),
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, product_id)
);

-- Create orders table
create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  status text not null default 'pending_verification'
    check (status in ('pending_verification', 'approved', 'rejected', 'needs_revision', 'fulfilled')),
  po_storage_path text,
  po_original_filename text,
  admin_feedback text,
  subtotal_ex_gst numeric(12,2) not null,
  gst_amount numeric(12,2) not null,
  total_incl_gst numeric(12,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create order_items table
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),
  quantity integer not null check (quantity > 0),
  unit_price_ex_gst_snapshot numeric(10,2) not null
);

-- Create order_status_history table
create table order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  status text not null,
  note text,
  changed_by uuid references profiles(id),
  changed_at timestamptz not null default now()
);
