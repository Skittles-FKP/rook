insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'operator-avatars',
  'operator-avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Operator avatars are publicly readable" on storage.objects;
create policy "Operator avatars are publicly readable"
on storage.objects for select
using (bucket_id = 'operator-avatars');

drop policy if exists "Operators can upload own avatar" on storage.objects;
create policy "Operators can upload own avatar"
on storage.objects for insert
with check (
  bucket_id = 'operator-avatars'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Operators can update own avatar" on storage.objects;
create policy "Operators can update own avatar"
on storage.objects for update
using (
  bucket_id = 'operator-avatars'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'operator-avatars'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Operators can remove own avatar" on storage.objects;
create policy "Operators can remove own avatar"
on storage.objects for delete
using (
  bucket_id = 'operator-avatars'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);
