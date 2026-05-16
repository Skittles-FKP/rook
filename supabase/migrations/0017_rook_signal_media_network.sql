create extension if not exists pgcrypto;

alter table public.signals
  add column if not exists media_type text,
  add column if not exists media_url text,
  add column if not exists thumbnail_url text,
  add column if not exists og_title text,
  add column if not exists og_description text,
  add column if not exists og_image text,
  add column if not exists media_metadata jsonb not null default '{}'::jsonb;

alter table public.signals
  drop constraint if exists signals_media_type_check;

alter table public.signals
  add constraint signals_media_type_check
  check (
    media_type is null or media_type in (
      'image',
      'video',
      'youtube',
      'x_post',
      'link',
      'pdf',
      'ai_generated',
      'chart'
    )
  );

update public.signals
set media_type = case
    when media_type is not null then media_type
    when image_url is not null then 'image'
    when chart_url is not null then 'chart'
    when embed_url ilike '%youtu.be/%' or embed_url ilike '%youtube.com/%' then 'youtube'
    when embed_url is not null then 'link'
    when reference_url is not null then 'link'
    else null
  end,
  media_url = coalesce(media_url, image_url, chart_url, embed_url, reference_url),
  thumbnail_url = coalesce(thumbnail_url, image_url, chart_url),
  media_metadata = coalesce(media_metadata, '{}'::jsonb)
where media_type is null
  and (image_url is not null or chart_url is not null or embed_url is not null or reference_url is not null);

create index if not exists signals_media_type_created_at_idx on public.signals(media_type, created_at desc);
create index if not exists signals_media_metadata_idx on public.signals using gin(media_metadata);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'rook-media',
    'rook-media',
    true,
    26214400,
    array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'application/pdf'
    ]
  ),
  (
    'signal-images',
    'signal-images',
    true,
    8388608,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'signal-videos',
    'signal-videos',
    true,
    26214400,
    array['video/mp4', 'video/webm', 'video/quicktime']
  )
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Rook media is publicly readable" on storage.objects;
create policy "Rook media is publicly readable"
on storage.objects for select
using (bucket_id in ('rook-media', 'signal-images', 'signal-videos'));

drop policy if exists "Operators can upload own Rook media" on storage.objects;
create policy "Operators can upload own Rook media"
on storage.objects for insert
with check (
  bucket_id in ('rook-media', 'signal-images', 'signal-videos')
  and auth.role() = 'authenticated'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Operators can update own Rook media" on storage.objects;
create policy "Operators can update own Rook media"
on storage.objects for update
using (
  bucket_id in ('rook-media', 'signal-images', 'signal-videos')
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id in ('rook-media', 'signal-images', 'signal-videos')
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Operators can delete own Rook media" on storage.objects;
create policy "Operators can delete own Rook media"
on storage.objects for delete
using (
  bucket_id in ('rook-media', 'signal-images', 'signal-videos')
  and auth.uid()::text = (storage.foldername(name))[1]
);
