-- Create categories table
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  product_type text not null default 'medicine' check (product_type in ('medicine', 'device')),
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Create products table
create table products (
  id uuid primary key default gen_random_uuid(),
  sap_code text unique,
  hsn_code text,
  name text not null,
  slug text not null unique,
  composition text not null,
  category_id uuid not null references categories(id),
  dosage_form text not null,
  manufacturer text not null,
  brand_line text not null,
  pack_size text,
  case_size text,
  mrp numeric(10,2),
  sp numeric(10,2),
  gst_percent numeric(4,2) not null default 5.00,
  description text,
  images jsonb not null default '[]'::jsonb,
  attributes jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  is_upcoming boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create indexes for products
create index idx_products_category on products(category_id);
create index idx_products_active on products(is_active);
