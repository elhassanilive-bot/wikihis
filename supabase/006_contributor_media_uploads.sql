-- Allow authenticated contributors to upload their own article cover images.
-- Run this after supabase/005_lock_admin_access.sql.
--
-- Admin uploads remain restricted by 005_lock_admin_access.sql.
-- Contributor uploads are limited to:
--   blog-media/member-covers/{auth.uid()}/...

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog-media',
  'blog-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "blog media contributor cover upload" on storage.objects;
create policy "blog media contributor cover upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'blog-media'
  and auth.uid() is not null
  and (storage.foldername(name))[1] = 'member-covers'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "blog media contributor cover update" on storage.objects;
create policy "blog media contributor cover update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'blog-media'
  and auth.uid() is not null
  and (storage.foldername(name))[1] = 'member-covers'
  and (storage.foldername(name))[2] = auth.uid()::text
)
with check (
  bucket_id = 'blog-media'
  and auth.uid() is not null
  and (storage.foldername(name))[1] = 'member-covers'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "blog media contributor cover delete" on storage.objects;
create policy "blog media contributor cover delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'blog-media'
  and auth.uid() is not null
  and (storage.foldername(name))[1] = 'member-covers'
  and (storage.foldername(name))[2] = auth.uid()::text
);
