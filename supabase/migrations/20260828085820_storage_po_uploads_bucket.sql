-- Create storage bucket for PO uploads (private bucket)
insert into storage.buckets (id, name, public)
values ('po-uploads', 'po-uploads', false)
on conflict (id) do nothing;

-- RLS policies for po-uploads bucket
-- Trade users can upload their own PO files
create policy "trade users upload own PO files"
  on storage.objects for insert
  with check (
    bucket_id = 'po-uploads' 
    and auth.uid()::text = owner_id
  );

-- Trade users can read their own PO files
create policy "trade users read own PO files"
  on storage.objects for select
  using (
    bucket_id = 'po-uploads' 
    and auth.uid()::text = owner_id
  );

-- Note: Admin access to any user's PO files is handled via createAdminClient()
-- which uses service_role and bypasses RLS entirely. No separate admin policy needed.
