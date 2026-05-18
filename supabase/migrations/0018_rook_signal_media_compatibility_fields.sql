alter table public.signals
  add column if not exists cover_image text,
  add column if not exists thumbnail text,
  add column if not exists media jsonb not null default '[]'::jsonb,
  add column if not exists visual_mode text not null default 'intel',
  add column if not exists video_url text,
  add column if not exists media_urls text[] not null default '{}',
  add column if not exists attachments jsonb not null default '[]'::jsonb;

update public.signals
set media_urls = case
    when coalesce(array_length(media_urls, 1), 0) > 0 then media_urls
    else array_remove(array[media_url, image_url, video_url, chart_url, embed_url, reference_url], null)
  end,
  attachments = coalesce(attachments, '[]'::jsonb),
  media_url = coalesce(media_url, image_url, video_url, chart_url, embed_url, reference_url),
  cover_image = coalesce(cover_image, image_url, og_image, thumbnail_url, chart_url),
  thumbnail = coalesce(thumbnail, thumbnail_url, og_image, image_url, chart_url),
  media = case
    when jsonb_array_length(coalesce(media, '[]'::jsonb)) > 0 then media
    else coalesce(attachments, '[]'::jsonb)
  end,
  media_type = case
    when media_type is not null then media_type
    when image_url is not null then 'image'
    when video_url is not null then 'video'
    when chart_url is not null then 'chart'
    when coalesce(embed_url, reference_url, media_url) ilike '%youtu.be/%'
      or coalesce(embed_url, reference_url, media_url) ilike '%youtube.com/%' then 'youtube'
    when coalesce(embed_url, reference_url, media_url) ilike '%loom.com/share/%'
      or coalesce(embed_url, reference_url, media_url) ilike '%loom.com/embed/%' then 'video'
    when coalesce(embed_url, reference_url, media_url) is not null then 'link'
    else null
  end,
  visual_mode = case
    when visual_mode in ('intel', 'financial', 'cyber', 'geopolitics', 'science') then visual_mode
    when lower(coalesce(title, '') || ' ' || coalesce(body, '') || ' ' || array_to_string(coalesce(ai_narrative_tags, '{}'), ' ')) ~ '(market|macro|rates|earnings|capital|liquidity|price|finance|financial|equity|credit)' then 'financial'
    when lower(coalesce(title, '') || ' ' || coalesce(body, '') || ' ' || array_to_string(coalesce(ai_narrative_tags, '{}'), ' ')) ~ '(cyber|breach|malware|exploit|vulnerability|security|ransomware|zero-day|cve)' then 'cyber'
    when lower(coalesce(title, '') || ' ' || coalesce(body, '') || ' ' || array_to_string(coalesce(ai_narrative_tags, '{}'), ' ')) ~ '(policy|geopolitic|export control|sanction|defense|border|election|treaty|governance)' then 'geopolitics'
    when lower(coalesce(title, '') || ' ' || coalesce(body, '') || ' ' || array_to_string(coalesce(ai_narrative_tags, '{}'), ' ')) ~ '(science|research|paper|lab|clinical|biology|physics|experiment)' then 'science'
    else 'intel'
  end
where coalesce(array_length(media_urls, 1), 0) = 0
   or attachments is null
   or media is null
   or cover_image is null
   or thumbnail is null
   or media_url is null
   or media_type is null
   or visual_mode is null;

create index if not exists signals_attachments_idx on public.signals using gin(attachments);
create index if not exists signals_media_urls_idx on public.signals using gin(media_urls);
create index if not exists signals_media_idx on public.signals using gin(media);
create index if not exists signals_visual_mode_created_at_idx on public.signals(visual_mode, created_at desc);
