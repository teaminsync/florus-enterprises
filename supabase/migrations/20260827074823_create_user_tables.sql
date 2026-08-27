-- Create profiles table (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('trade', 'admin')),
  account_type text check (account_type in ('doctor', 'pharmacy', 'retailer', 'hospital')),
  full_name text not null,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Create trade_applications table
create table trade_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_type text not null check (applicant_type in ('doctor', 'pharmacy', 'retailer', 'hospital')),
  full_name text not null,
  business_or_clinic_name text,
  registration_number text,
  licence_number text,
  address text not null,
  city text not null,
  state text not null,
  pincode text not null,
  phone text not null,
  email text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_notes text,
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  linked_profile_id uuid references profiles(id),
  created_at timestamptz not null default now()
);
