"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Bot, Download, ExternalLink, FileText, ImageIcon, Link2, Maximize2, Play, X } from "lucide-react";
import { detectMediaUrl, getSafeHostname, type SignalAttachment, type SignalMediaType } from "@/lib/media";
import type { SignalWithAuthor } from "@/lib/supabase/types";

export function SignalMedia({ signal }: { signal: SignalWithAuthor }) {
  const [previewMedia, setPreviewMedia] = useState<NormalizedMedia | null>(null);
  const mediaItems = useMemo(() => normalizeSignalMediaItems(signal), [signal]);

  if (mediaItems.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 space-y-3">
      {mediaItems.length > 0 && (
        <div className={mediaItems.length > 1 ? "grid gap-3" : ""}>
          <MediaFrame media={mediaItems[0]} priority onOpenPreview={() => setPreviewMedia(mediaItems[0])} />
          {mediaItems.length > 1 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {mediaItems.slice(1, 5).map((media, index) => (
                <MediaFrame
                  key={`${media.mediaUrl}-${index}`}
                  media={media}
                  compact
                  onOpenPreview={() => setPreviewMedia(media)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {previewMedia && isImageMedia(previewMedia.mediaType) && (
        <ImagePreviewModal media={previewMedia} onClose={() => setPreviewMedia(null)} />
      )}
    </div>
  );
}

type NormalizedMedia = {
  mediaType: SignalMediaType;
  mediaUrl: string;
  thumbnailUrl: string | null;
  embedUrl: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  domain: string | null;
  aiGenerated: boolean;
};

type MediaCandidate = Partial<Omit<NormalizedMedia, "mediaUrl" | "thumbnailUrl" | "embedUrl" | "ogTitle" | "ogDescription" | "ogImage" | "domain">> & {
  rawType?: string | null;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  embedUrl?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: string | null;
};

function MediaFrame({
  media,
  compact = false,
  priority = false,
  onOpenPreview,
}: {
  media: NormalizedMedia;
  compact?: boolean;
  priority?: boolean;
  onOpenPreview: () => void;
}) {
  const imageFit = media.mediaType === "chart" ? "object-contain" : "object-cover";
  const frameClass = media.aiGenerated
    ? "rook-media-frame rook-ai-media-frame rounded-xl border border-rook-cyan/35 bg-rook-cyan/5"
    : "rook-media-frame rounded-xl border border-white/10 bg-white/[0.035]";

  return (
    <div className={`${frameClass} overflow-hidden`}>
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          {media.aiGenerated ? <Bot className="h-4 w-4 text-rook-cyan" /> : media.mediaType === "pdf" ? <FileText className="h-4 w-4 text-rook-cyan" /> : media.mediaType === "video" || media.mediaType === "youtube" ? <Play className="h-4 w-4 text-rook-cyan" /> : <ImageIcon className="h-4 w-4 text-rook-cyan" />}
          <p className="truncate text-xs font-black uppercase tracking-[0.16em] text-rook-cyan">
            {media.aiGenerated ? "AI Generated" : media.mediaType.replace("_", " ")}
          </p>
        </div>
        {media.domain && (
          <span className="max-w-[48%] truncate rounded-full border border-white/10 bg-rook-void/45 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-rook-muted sm:max-w-[60%]">
            {media.domain}
          </span>
        )}
      </div>

      {isImageMedia(media.mediaType) && (
        <button type="button" onClick={onOpenPreview} className={`group relative block w-full overflow-hidden bg-rook-void ${compact ? "aspect-[4/3]" : "aspect-[16/9]"}`}>
          <FallbackImage
            src={media.mediaUrl}
            alt={media.ogTitle ?? "Signal visual evidence"}
            fill
            sizes="(min-width: 1024px) 760px, 100vw"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            className={`${imageFit} blur-0 transition duration-500 group-hover:scale-[1.025]`}
            loading={priority ? undefined : "lazy"}
            priority={priority}
          />
          <div className="absolute inset-0 bg-[linear-gradient(transparent,rgba(5,6,10,0.42))] opacity-80" />
          <span className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-full bg-rook-void/75 px-3 py-1 text-xs font-black text-white backdrop-blur-md">
            <Maximize2 className="h-3.5 w-3.5 text-rook-cyan" />
            <span className="hidden sm:inline">Expand</span>
          </span>
        </button>
      )}

      {media.mediaType === "video" && media.embedUrl && (
        <iframe
          src={media.embedUrl}
          title="Embedded signal video"
          loading="lazy"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className={`${compact ? "aspect-[4/3]" : "aspect-video"} w-full border-0 bg-rook-void`}
        />
      )}

      {media.mediaType === "video" && !media.embedUrl && (
        <video
          src={media.mediaUrl}
          poster={media.thumbnailUrl ?? undefined}
          controls
          muted
          playsInline
          preload="metadata"
          className={`${compact ? "aspect-[4/3]" : "aspect-video"} w-full bg-rook-void object-cover`}
        />
      )}

      {(media.mediaType === "youtube" || media.mediaType === "x_post") && media.embedUrl && (
        <iframe
          src={media.embedUrl}
          title={media.mediaType === "youtube" ? "YouTube signal evidence" : "X post signal evidence"}
          loading="lazy"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className={media.mediaType === "youtube" ? `${compact ? "aspect-[4/3]" : "aspect-video"} w-full border-0 bg-rook-void` : "min-h-[360px] w-full border-0 bg-rook-void"}
        />
      )}

      {media.mediaType === "pdf" && (
        <div className="grid gap-4 p-4 sm:grid-cols-[88px_1fr]">
          <div className="grid aspect-[3/4] place-items-center rounded-lg border border-rook-cyan/20 bg-rook-cyan/10">
            <FileText className="h-9 w-9 text-rook-cyan" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-white">{media.ogTitle ?? "PDF intelligence attachment"}</p>
            <p className="mt-2 text-sm leading-6 text-rook-muted">{media.ogDescription ?? "Open the attachment in a secure browser tab for full document review."}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={media.mediaUrl} target="_blank" rel="noreferrer" className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-black text-rook-void transition hover:bg-rook-cyan">
                <ExternalLink className="h-4 w-4" />
                Open PDF
              </Link>
              <Link href={media.mediaUrl} target="_blank" rel="noreferrer" className="focus-ring inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-bold text-rook-muted transition hover:text-white">
                <Download className="h-4 w-4 text-rook-cyan" />
                Download
              </Link>
            </div>
          </div>
        </div>
      )}

      {media.mediaType === "link" && (
        <Link href={media.mediaUrl} target="_blank" rel="noreferrer" className="focus-ring grid w-full min-w-0 gap-0 overflow-hidden transition hover:border-rook-cyan/40 md:grid-cols-[minmax(180px,240px)_1fr]">
          <div className="relative aspect-video min-h-40 bg-rook-void md:aspect-auto">
            {media.ogImage ? (
              <FallbackImage src={media.ogImage} alt="" fill sizes="(min-width: 768px) 240px, 100vw" className="object-cover" loading="lazy" />
            ) : (
              <div className="grid h-full min-h-32 place-items-center">
                <Link2 className="h-8 w-8 text-rook-cyan" />
              </div>
            )}
          </div>
          <div className="min-w-0 p-4">
            {media.domain && <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rook-cyan">{media.domain}</p>}
            <p className="mt-1 text-base font-black leading-6 text-white [overflow-wrap:anywhere]">{media.ogTitle ?? media.domain ?? "External intelligence source"}</p>
            <p className="mt-2 text-sm leading-6 text-rook-muted [overflow-wrap:anywhere]">{media.ogDescription ?? "Open source preview attached to this Signal."}</p>
            <p className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-rook-cyan">
              <ExternalLink className="h-3.5 w-3.5" />
              Open source
            </p>
          </div>
        </Link>
      )}
    </div>
  );
}

function FallbackImage({ alt, onError, src, unoptimized, ...props }: React.ComponentProps<typeof Image>) {
  const [failed, setFailed] = useState(false);
  const isExternal = typeof src === "string" && /^https?:\/\//i.test(src);

  if (failed) {
    return (
      <div className="absolute inset-0 grid place-items-center bg-rook-void">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-rook-muted">
          Media unavailable
        </div>
      </div>
    );
  }

  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      unoptimized={unoptimized ?? isExternal}
      onError={(event) => {
        setFailed(true);
        onError?.(event);
      }}
    />
  );
}

function ImagePreviewModal({ media, onClose }: { media: NormalizedMedia; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-rook-void/90 p-4 backdrop-blur-xl" role="dialog" aria-modal="true">
      <button type="button" onClick={onClose} className="focus-ring absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-white transition hover:bg-white/[0.12]">
        <X className="h-5 w-5" />
      </button>
      <div className="relative h-[82vh] w-full max-w-6xl overflow-hidden rounded-xl border border-rook-cyan/20 bg-rook-void shadow-glow">
        <Image src={media.mediaUrl} alt={media.ogTitle ?? "Expanded Signal media"} fill sizes="100vw" className="object-contain" />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-rook-void via-rook-void/70 to-transparent p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-rook-cyan">{media.aiGenerated ? "AI Generated Visual" : "Visual Evidence"}</p>
          {media.ogTitle && <p className="mt-1 text-sm font-bold text-white">{media.ogTitle}</p>}
        </div>
      </div>
    </div>
  );
}

export function normalizeSignalMediaItems(signal: SignalWithAuthor): NormalizedMedia[] {
  const candidates: MediaCandidate[] = [];
  const attachments = normalizeAttachments(signal.attachments);

  for (const attachment of attachments) {
    candidates.push({
      rawType: attachment.type ?? null,
      mediaUrl: attachment.media_url ?? attachment.url ?? null,
      thumbnailUrl: attachment.thumbnail_url ?? null,
      embedUrl: attachment.embed_url ?? null,
      ogTitle: attachment.title ?? null,
      ogDescription: attachment.description ?? null,
      aiGenerated: attachment.type === "ai_generated" || attachment.metadata?.aiGenerated === true,
    });
  }

  for (const url of signal.media_urls ?? []) {
    candidates.push({ mediaUrl: url });
  }

  candidates.push(
    { rawType: signal.media_type, mediaUrl: signal.media_url, thumbnailUrl: signal.thumbnail_url, embedUrl: signal.embed_url, ogTitle: signal.og_title, ogDescription: signal.og_description, ogImage: signal.og_image, aiGenerated: signal.media_type === "ai_generated" || signal.media_metadata?.aiGenerated === true },
    { rawType: "image", mediaUrl: signal.image_url, thumbnailUrl: signal.image_url },
    { rawType: "video", mediaUrl: signal.video_url },
    { rawType: "chart", mediaUrl: signal.chart_url, thumbnailUrl: signal.chart_url },
    { mediaUrl: signal.embed_url, embedUrl: signal.embed_url },
    { rawType: "link", mediaUrl: signal.reference_url, ogTitle: signal.og_title, ogDescription: signal.og_description, ogImage: signal.og_image },
  );

  const seen = new Set<string>();
  return candidates
    .map((candidate) => normalizeMediaCandidate(candidate, signal))
    .filter((media): media is NormalizedMedia => {
      if (!media?.mediaUrl || seen.has(media.mediaUrl)) return false;
      seen.add(media.mediaUrl);
      return true;
    })
    .slice(0, 6);
}

function normalizeMediaCandidate(
  candidate: MediaCandidate,
  signal: SignalWithAuthor,
): NormalizedMedia | null {
  const mediaUrl = candidate.mediaUrl?.trim();
  if (!mediaUrl) return null;

  const detected = detectMediaUrl(mediaUrl, candidate.aiGenerated || candidate.rawType === "ai_generated");
  const detectedType = detected.mediaType ?? (candidate.rawType as SignalMediaType | null) ?? "link";
  const mediaType = normalizeMediaType(candidate.rawType) ?? detectedType;
  const embedUrl = safeEmbedUrl(candidate.embedUrl, mediaType) ?? detected.embedUrl;

  return {
    mediaType,
    mediaUrl,
    thumbnailUrl: candidate.thumbnailUrl ?? detected.thumbnailUrl ?? signal.thumbnail_url ?? signal.og_image ?? signal.image_url ?? signal.chart_url ?? null,
    embedUrl,
    ogTitle: candidate.ogTitle ?? signal.og_title ?? null,
    ogDescription: candidate.ogDescription ?? signal.og_description ?? null,
    ogImage: candidate.ogImage ?? signal.og_image ?? null,
    domain: getSafeHostname(mediaUrl),
    aiGenerated: Boolean(candidate.aiGenerated || mediaType === "ai_generated" || signal.media_metadata?.aiGenerated === true),
  };
}

function normalizeAttachments(value: SignalWithAuthor["attachments"]): SignalAttachment[] {
  return Array.isArray(value)
    ? value.filter((item): item is SignalAttachment => typeof item === "object" && item !== null)
    : [];
}

function normalizeMediaType(value: string | null | undefined): SignalMediaType | null {
  return value === "image" ||
    value === "video" ||
    value === "youtube" ||
    value === "x_post" ||
    value === "link" ||
    value === "pdf" ||
    value === "ai_generated" ||
    value === "chart"
    ? value
    : null;
}

function safeEmbedUrl(value: string | null | undefined, mediaType: SignalMediaType) {
  if (!value || !["youtube", "x_post", "video"].includes(mediaType)) return null;
  const detected = detectMediaUrl(value);
  return detected.embedUrl;
}

function isImageMedia(mediaType: SignalMediaType) {
  return mediaType === "image" || mediaType === "ai_generated" || mediaType === "chart";
}

const BLUR_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMzInIGhlaWdodD0nMTgnIHZpZXdCb3g9JzAgMCAzMiAxOCcgeG1sbnM9J2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJz48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9J2cnIHgxPScwJyB4Mj0nMScgeTE9JzAnIHkyPScxJz48c3RvcCBzdG9wLWNvbG9yPScjMDUwNjBhJy8+PHN0b3Agb2Zmc2V0PScxJyBzdG9wLWNvbG9yPScjMTAxMzFkJy8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3QgZmlsbD0ndXJsKCNnKScgd2lkdGg9JzMyJyBoZWlnaHQ9JzE4Jy8+PC9zdmc+";
