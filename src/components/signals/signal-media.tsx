"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Bot, Download, ExternalLink, FileText, ImageIcon, Link2, Maximize2, Play, ShieldCheck, X } from "lucide-react";
import { buildSignalEvidencePacket } from "@/lib/signal-evidence";
import { detectMediaUrl, getSafeHostname, type SignalMediaType } from "@/lib/media";
import type { SignalWithAuthor } from "@/lib/supabase/types";

export function SignalMedia({ signal }: { signal: SignalWithAuthor }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const media = useMemo(() => normalizeSignalMedia(signal), [signal]);
  const evidence = buildSignalEvidencePacket(signal);
  const externalEvidence = evidence.items.filter((item) => item.type !== "graph");

  if (!media.mediaUrl && externalEvidence.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 space-y-3">
      {externalEvidence.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(53,216,255,0.08),rgba(255,255,255,0.025))] p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-rook-cyan" />
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rook-cyan">Source Preview</p>
              </div>
              <p className="mt-2 truncate text-sm font-black text-white">{evidence.sourceTitle}</p>
              <p className="mt-1 text-xs text-rook-muted">{evidence.sourceDomain} · {evidence.evidenceType}</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-rook-green/20 bg-rook-green/10 px-2 py-1 text-[10px] font-black text-rook-green">
              <ShieldCheck className="h-3.5 w-3.5" />
              {evidence.credibility}% credible
            </span>
          </div>
        </div>
      )}

      {media.mediaUrl && (
        <MediaFrame media={media} onOpenPreview={() => setPreviewOpen(true)} />
      )}

      {previewOpen && media.mediaUrl && isImageMedia(media.mediaType) && (
        <ImagePreviewModal media={media} onClose={() => setPreviewOpen(false)} />
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

function MediaFrame({
  media,
  onOpenPreview,
}: {
  media: NormalizedMedia;
  onOpenPreview: () => void;
}) {
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
          <span className="truncate rounded-full border border-white/10 bg-rook-void/45 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-rook-muted">
            {media.domain}
          </span>
        )}
      </div>

      {isImageMedia(media.mediaType) && (
        <button type="button" onClick={onOpenPreview} className="group relative block aspect-[16/9] w-full overflow-hidden bg-rook-void">
          <Image
            src={media.mediaUrl}
            alt={media.ogTitle ?? "Signal visual evidence"}
            fill
            sizes="(min-width: 1024px) 760px, 100vw"
            className="object-cover blur-0 transition duration-500 group-hover:scale-[1.025]"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-[linear-gradient(transparent,rgba(5,6,10,0.42))] opacity-80" />
          <span className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-full bg-rook-void/75 px-3 py-1 text-xs font-black text-white backdrop-blur-md">
            <Maximize2 className="h-3.5 w-3.5 text-rook-cyan" />
            Expand
          </span>
        </button>
      )}

      {media.mediaType === "video" && (
        <video
          src={media.mediaUrl}
          poster={media.thumbnailUrl ?? undefined}
          controls
          muted
          playsInline
          preload="metadata"
          className="aspect-video w-full bg-rook-void object-cover"
        />
      )}

      {(media.mediaType === "youtube" || media.mediaType === "x_post") && media.embedUrl && (
        <iframe
          src={media.embedUrl}
          title={media.mediaType === "youtube" ? "YouTube signal evidence" : "X post signal evidence"}
          loading="lazy"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className={media.mediaType === "youtube" ? "aspect-video w-full border-0 bg-rook-void" : "min-h-[420px] w-full border-0 bg-rook-void"}
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
        <Link href={media.mediaUrl} target="_blank" rel="noreferrer" className="focus-ring grid gap-0 overflow-hidden transition hover:border-rook-cyan/40 sm:grid-cols-[180px_1fr]">
          <div className="relative aspect-video bg-rook-void sm:aspect-auto">
            {media.ogImage ? (
              <Image src={media.ogImage} alt="" fill sizes="220px" className="object-cover" loading="lazy" />
            ) : (
              <div className="grid h-full min-h-32 place-items-center">
                <Link2 className="h-8 w-8 text-rook-cyan" />
              </div>
            )}
          </div>
          <div className="min-w-0 p-4">
            <p className="truncate text-sm font-black text-white">{media.ogTitle ?? media.domain ?? "External intelligence source"}</p>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-rook-muted">{media.ogDescription ?? "Open source preview attached to this Signal."}</p>
            <p className="mt-3 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-rook-cyan">
              <ExternalLink className="h-3.5 w-3.5" />
              Open source
            </p>
          </div>
        </Link>
      )}
    </div>
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

function normalizeSignalMedia(signal: SignalWithAuthor): NormalizedMedia {
  const legacyUrl = signal.image_url ?? signal.chart_url ?? signal.embed_url ?? signal.reference_url ?? "";
  const detected = detectMediaUrl(signal.media_url ?? legacyUrl, signal.media_type === "ai_generated");
  const mediaType = signal.media_type ?? detected.mediaType ?? (signal.chart_url ? "chart" : signal.image_url ? "image" : "link");
  const mediaUrl = signal.media_url ?? detected.mediaUrl ?? legacyUrl;
  const embedUrl = signal.embed_url?.startsWith("http") && (mediaType === "youtube" || mediaType === "x_post")
    ? detected.embedUrl ?? signal.embed_url
    : detected.embedUrl ?? signal.embed_url ?? null;

  return {
    mediaType,
    mediaUrl,
    thumbnailUrl: signal.thumbnail_url ?? detected.thumbnailUrl ?? signal.og_image ?? signal.image_url ?? signal.chart_url ?? null,
    embedUrl,
    ogTitle: signal.og_title ?? null,
    ogDescription: signal.og_description ?? null,
    ogImage: signal.og_image ?? null,
    domain: getSafeHostname(mediaUrl),
    aiGenerated: mediaType === "ai_generated" || signal.media_metadata?.aiGenerated === true,
  };
}

function isImageMedia(mediaType: SignalMediaType) {
  return mediaType === "image" || mediaType === "ai_generated" || mediaType === "chart";
}
