# Rook Signal Media Setup

## Migration

Apply:

```text
supabase/migrations/0017_rook_signal_media_network.sql
```

This adds media fields to `public.signals`, backfills legacy `image_url`, `chart_url`, `embed_url`, and `reference_url` into the new media model, and creates the public `rook-media` Supabase Storage bucket.

## Signal Media Fields

```text
media_type: image | video | youtube | x_post | link | pdf | ai_generated | chart
media_url
thumbnail_url
embed_url
og_title
og_description
og_image
media_metadata jsonb
```

Legacy fields remain supported:

```text
image_url
chart_url
reference_url
embed_url
```

## Storage

Bucket:

```text
rook-media
```

Allowed MIME types:

```text
image/jpeg
image/png
image/webp
image/gif
video/mp4
video/webm
video/quicktime
application/pdf
```

Size limits enforced by app utilities:

```text
images: 8 MB
videos: 25 MB
PDFs: 18 MB
```

Cloudflare/Next server action body limit is set to `28mb` in `next.config.ts`.

## Embed Safety

The app only creates iframe embeds for known providers:

```text
YouTube: youtube.com, youtu.be -> youtube-nocookie.com
X/Twitter: x.com, twitter.com -> platform.twitter.com
```

Other URLs render as OG preview cards. Unsafe protocols are rejected by media detection.

## UI

Media rendering is handled by:

```text
src/components/signals/signal-media.tsx
```

Upload and detection utilities are in:

```text
src/lib/media.ts
src/lib/og.ts
```

The Signal composer supports file upload, pasted URLs, auto-detection, OG preview capture, and AI-generated media tagging.
