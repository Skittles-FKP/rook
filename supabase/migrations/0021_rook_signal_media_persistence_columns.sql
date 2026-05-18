alter table public.signals
  add column if not exists attachments jsonb not null default '[]'::jsonb,
  add column if not exists media_url text,
  add column if not exists media_type text,
  add column if not exists thumbnail_url text;

alter table public.signals
  add column if not exists media jsonb not null default '[]'::jsonb,
  add column if not exists media_urls text[] not null default '{}',
  add column if not exists cover_image text,
  add column if not exists thumbnail text,
  add column if not exists image_url text,
  add column if not exists video_url text,
  add column if not exists chart_url text,
  add column if not exists embed_url text,
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
  ) not valid;

update public.signals
set
  media_url = coalesce(media_url, image_url, video_url, chart_url, embed_url, reference_url),
  thumbnail_url = coalesce(thumbnail_url, thumbnail, cover_image, image_url, og_image),
  attachments = case
    when jsonb_typeof(coalesce(attachments, '[]'::jsonb)) = 'array'
      and jsonb_array_length(coalesce(attachments, '[]'::jsonb)) > 0
      then attachments
    when coalesce(media_url, image_url, video_url, chart_url, embed_url, reference_url) is not null
      then jsonb_build_array(jsonb_build_object(
        'type', coalesce(media_type, 'image'),
        'url', coalesce(media_url, image_url, video_url, chart_url, embed_url, reference_url),
        'width', null,
        'height', null,
        'name', coalesce(og_title, title, 'Signal media')
      ))
    else '[]'::jsonb
  end,
  media = case
    when jsonb_typeof(coalesce(media, '[]'::jsonb)) = 'array'
      and jsonb_array_length(coalesce(media, '[]'::jsonb)) > 0
      then media
    else attachments
  end,
  media_urls = case
    when coalesce(array_length(media_urls, 1), 0) > 0 then media_urls
    else array_remove(array[media_url, image_url, video_url, chart_url, embed_url, reference_url], null)
  end
where coalesce(media_url, image_url, video_url, chart_url, embed_url, reference_url) is not null
   or attachments is null
   or media is null
   or media_urls is null
   or thumbnail_url is null;

create index if not exists signals_attachments_idx
  on public.signals using gin(attachments);

create index if not exists signals_media_urls_idx
  on public.signals using gin(media_urls);

do $$
begin
  perform pg_notify('pgrst', 'reload schema');
exception
  when others then null;
end $$;
