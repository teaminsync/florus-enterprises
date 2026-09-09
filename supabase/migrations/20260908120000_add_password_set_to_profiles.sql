-- Add password_set column to profiles table
alter table profiles add column password_set boolean not null default false;

-- Backfill existing profiles (all existing accounts have already set passwords)
update profiles set password_set = true;
