"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BarChart3, Bot, Download, ExternalLink, FileText, ImageIcon, Link2, Maximize2, Play, X } from "lucide-react";
import { buildSignalFallbackImage, getSignalMedia, inferSignalVisualMode, type NormalizedSignalMedia, type SignalMediaType, type SignalVisualMode } from "@/lib/media";
import type { SignalWithAuthor } from "@/lib/supabase/types";

export function SignalMedia({
  signal,
  compact = false,
  fallback = false,
}: {
  signal: SignalWithAuthor;
  compact?: boolean;
  fallback?: boolean;
}) {
  const [previewMedia, setPreviewMedia] = useState<NormalizedMedia | null>(null);
  const mediaItems = useMemo(() => normalizeSignalMediaItems(signal, { fallback }), [signal, fallback]);

  if (mediaItems.length === 0) {
    return null;
  }

  const mode = inferSignalVisualMode(signal);
  const fallbackSrc = buildSignalFallbackImage(signal);

  return (
    <div className="mt-4 space-y-3">
      {mediaItems.length > 0 && (
        <div className={mediaItems.length > 1 ? "grid gap-3" : ""}>
          <MediaFrame media={mediaItems[0]} priority compact={compact} mode={mode} fallbackSrc={fallbackSrc} onOpenPreview={() => setPreviewMedia(mediaItems[0])} />
          {mediaItems.length > 1 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {mediaItems.slice(1, 5).map((media, index) => (
                <MediaFrame
                  key={`${media.mediaUrl}-${index}`}
                  media={media}
                  compact
                  mode={mode}
                  fallbackSrc={fallbackSrc}
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
  synthetic: boolean;
};

function MediaFrame({
  media,
  compact = false,
  priority = false,
  mode,
  fallbackSrc,
  onOpenPreview,
}: {
  media: NormalizedMedia;
  compact?: boolean;
  priority?: boolean;
  mode: SignalVisualMode;
  fallbackSrc: string;
  onOpenPreview: () => void;
}) {
  const imageFit = media.mediaType === "chart" ? "object-contain" : "object-cover";
  const imageAspect = compact ? "aspect-[4/3]" : "aspect-[16/9]";
  const sparseLink = media.mediaType === "link" && !media.ogTitle && !media.ogDescription && !media.ogImage;
  const frameClass = media.aiGenerated
    ? `rook-media-frame rook-ai-media-frame rook-visual-${mode} rounded-xl border border-rook-cyan/35 bg-rook-cyan/5`
    : `rook-media-frame rook-visual-${mode} rounded-xl border border-white/10 bg-white/[0.035]`;

  if (sparseLink) {
    return (
      <Link
        href={media.mediaUrl}
        target="_blank"
        rel="noreferrer"
        className="focus-ring media-link-chip flex min-w-0 max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-rook-muted transition hover:border-rook-cyan/30 hover:text-white"
      >
        <Link2 className="h-4 w-4 shrink-0 text-rook-cyan" />
        <span className="min-w-0 flex-1 truncate">{media.domain ?? media.mediaUrl}</span>
        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
      </Link>
    );
  }

  return (
    <div className={`${frameClass} media-frame-safe overflow-hidden`}>
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          {media.aiGenerated ? <Bot className="h-4 w-4 text-rook-cyan" /> : media.mediaType === "pdf" ? <FileText className="h-4 w-4 text-rook-cyan" /> : media.mediaType === "video" || media.mediaType === "youtube" ? <Play className="h-4 w-4 text-rook-cyan" /> : <ImageIcon className="h-4 w-4 text-rook-cyan" />}
          <p className="truncate text-xs font-black uppercase tracking-[0.16em] text-rook-cyan">
            {media.synthetic ? "AI Fallback" : media.aiGenerated ? "AI Generated" : media.mediaType.replace("_", " ")}
          </p>
        </div>
        {media.domain && (
          <span className="max-w-[48%] truncate rounded-full border border-white/10 bg-rook-void/45 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-rook-muted sm:max-w-[60%]">
            {media.domain}
          </span>
        )}
      </div>

      {media.mediaType === "chart" && (
        <button
          type="button"
          onClick={onOpenPreview}
          className="group relative block h-24 max-h-24 w-full overflow-hidden bg-rook-void md:h-28 md:max-h-28"
        >
          <ChartTrendStrip title={media.ogTitle ?? "Chart signal"} />
          <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-rook-void/75 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-rook-cyan backdrop-blur-md">
            <Maximize2 className="h-3.5 w-3.5" />
            Expand
          </span>
        </button>
      )}

      {isImageMedia(media.mediaType) && media.mediaType !== "chart" && (
        <button type="button" onClick={onOpenPreview} className={`group relative block w-full overflow-hidden bg-rook-void ${imageAspect}`}>
          <FallbackImage
            src={media.mediaUrl}
            alt={media.ogTitle ?? "Signal visual evidence"}
            fill
            sizes="(min-width: 1024px) 760px, 100vw"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            className={`${imageFit} blur-0 transition duration-700 group-hover:scale-[1.055]`}
            loading={priority ? undefined : "lazy"}
            priority={priority}
            fallbackSrc={fallbackSrc}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,6,10,0.02),rgba(5,6,10,0.18)_45%,rgba(5,6,10,0.74))] opacity-90 transition duration-500 group-hover:opacity-70" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-[radial-gradient(ellipse_at_bottom,rgba(53,216,255,0.22),transparent_62%)] opacity-70" />
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
        <Link href={media.mediaUrl} target="_blank" rel="noreferrer" className="focus-ring media-link-card flex w-full min-w-0 max-w-full overflow-hidden transition hover:border-rook-cyan/40">
          <div className="relative aspect-video w-32 shrink-0 bg-rook-void sm:w-40">
            {media.ogImage ? (
              <FallbackImage src={media.ogImage} alt="" fill sizes="(min-width: 768px) 240px, 100vw" className="object-cover" loading="lazy" fallbackSrc={fallbackSrc} />
            ) : (
              <div className="grid h-full place-items-center">
                <Link2 className="h-8 w-8 text-rook-cyan" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 p-3 sm:p-4">
            {media.domain && <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rook-cyan">{media.domain}</p>}
            <p className="media-link-title mt-1 text-sm font-black leading-5 text-white">{media.ogTitle ?? media.domain ?? "External intelligence source"}</p>
            <p className="media-link-desc mt-1.5 text-xs leading-5 text-rook-muted">{media.ogDescription ?? "Open source preview attached to this Signal."}</p>
            <p className="mt-2 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.12em] text-rook-cyan">
              <ExternalLink className="h-3.5 w-3.5" />
              Open source
            </p>
          </div>
        </Link>
      )}
    </div>
  );
}

function ChartTrendStrip({ title }: { title: string }) {
  return (
    <div className="chart-trend-strip relative h-full w-full overflow-hidden px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <BarChart3 className="h-4 w-4 shrink-0 text-rook-green" />
          <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-rook-green">
            Compact trend
          </p>
        </div>
        <p className="truncate text-[10px] font-bold text-rook-muted">{title}</p>
      </div>
      <div className="mt-3 flex h-10 items-end gap-1.5">
        {[34, 46, 38, 62, 54, 78, 66, 88, 72, 92, 84, 98].map((height, index) => (
          <span
            key={`${height}-${index}`}
            className="chart-trend-bar flex-1 rounded-t-sm bg-gradient-to-t from-rook-blue/35 via-rook-cyan/70 to-rook-green"
            style={{ height: `${height}%`, animationDelay: `${index * 55}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function FallbackImage({
  alt,
  fallbackSrc,
  onError,
  src,
  unoptimized,
  ...props
}: React.ComponentProps<typeof Image> & { fallbackSrc: string }) {
  const [failed, setFailed] = useState(false);
  const resolvedSrc = failed ? fallbackSrc : src;
  const isExternal = typeof resolvedSrc === "string" && /^https?:\/\//i.test(resolvedSrc);

  return (
    <Image
      {...props}
      src={resolvedSrc}
      alt={alt}
      unoptimized={unoptimized ?? isExternal}
      onError={(event) => {
        if (!failed) setFailed(true);
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

export function normalizeSignalMediaItems(signal: SignalWithAuthor, options: { fallback?: boolean } = {}): NormalizedMedia[] {
  return getSignalMedia(signal, options).map((media) => ({
    mediaType: media.type,
    mediaUrl: media.url,
    thumbnailUrl: media.thumbnailUrl,
    embedUrl: media.embedUrl,
    ogTitle: media.title,
    ogDescription: media.description,
    ogImage: signal.og_image ?? null,
    domain: media.domain,
    aiGenerated: media.aiGenerated,
    synthetic: media.synthetic,
  }));
}

export function normalizeSignalMediaRecords(signal: SignalWithAuthor, options: { fallback?: boolean } = {}): NormalizedSignalMedia[] {
  return getSignalMedia(signal, options);
}

function isImageMedia(mediaType: SignalMediaType) {
  return mediaType === "image" || mediaType === "ai_generated" || mediaType === "chart";
}

const BLUR_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMzInIGhlaWdodD0nMTgnIHZpZXdCb3g9JzAgMCAzMiAxOCcgeG1sbnM9J2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJz48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9J2cnIHgxPScwJyB4Mj0nMScgeTE9JzAnIHkyPScxJz48c3RvcCBzdG9wLWNvbG9yPScjMDUwNjBhJy8+PHN0b3Agb2Zmc2V0PScxJyBzdG9wLWNvbG9yPScjMTAxMzFkJy8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3QgZmlsbD0ndXJsKCNnKScgd2lkdGg9JzMyJyBoZWlnaHQ9JzE4Jy8+PC9zdmc+";
