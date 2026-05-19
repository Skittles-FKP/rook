"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AlertTriangle, BarChart3, Bookmark, BrainCircuit, ChevronDown, Eye, Maximize2, MessageCircle, Radio, Repeat2, ShieldCheck, Sparkles, ThumbsUp, TrendingUp, X } from "lucide-react";
import { clsx } from "clsx";
import { toggleAmplifyAction, toggleLikeAction } from "@/app/actions/signals";
import { SignalCard } from "@/components/signal-card";
import { OperatorAvatar } from "@/components/operator-avatar";
import { SignalComposer } from "@/components/signals/signal-composer";
import { MediaBoundary, SignalErrorBoundary } from "@/components/signals/signal-error-boundary";
import { formatRelativeTime } from "@/lib/format";
import { getSignalMedia } from "@/lib/media";
import { getSignalType, rankFeedSignals, type RankedSignal } from "@/lib/feed-ranking";
import { newsFeedAgent } from "@/lib/agents/news/newsFeedAgent";
import { scorePulseSignal } from "@/lib/pulse";
import { buildSignalEvidencePacket } from "@/lib/signal-evidence";
import type { SignalWithAuthor } from "@/lib/supabase/types";

type FlockOption = {
  id: string;
  name: string;
};

type Gesture = "save" | "amplify" | "dismiss";

export function MobileSignalFeed({
  signals,
  flocks,
}: {
  signals: RankedSignal[];
  flocks: FlockOption[];
}) {
  const safeInitialSignals = useMemo(() => normalizeRankedSignals(signals), [signals]);
  const safeFlocks = useMemo(() => normalizeFlocks(flocks), [flocks]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [briefSignal, setBriefSignal] = useState<SignalWithAuthor | null>(null);
  const [liveSignals, setLiveSignals] = useState<RankedSignal[]>(safeInitialSignals);
  const [liveInsertions, setLiveInsertions] = useState(0);

  useEffect(() => {
    setLiveSignals(safeInitialSignals);
  }, [safeInitialSignals]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let active = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    function scheduleNext(index: number) {
      const delay = 10_000 + (index % 6) * 3_000;
      timeoutId = setTimeout(() => {
        if (!active) return;
        const next = newsFeedAgent.nextMockSignal(index);
        setLiveSignals((current) => {
          const propagated = normalizeRankedSignals(current).map((item, itemIndex) => ({
            ...item.signal,
            likes_count: (item.signal.likes_count ?? 0) + (itemIndex % 3 === 0 ? 1 : 0),
            amplifies_count: (item.signal.amplifies_count ?? 0) + (itemIndex % 4 === 0 ? 1 : 0),
            comments_count: (item.signal.comments_count ?? 0) + (itemIndex % 5 === 0 ? 1 : 0),
            updated_at: new Date().toISOString(),
          }));
          return normalizeRankedSignals(rankFeedSignals([next, ...propagated].slice(0, 44)));
        });
        setLiveInsertions((count) => count + 1);
        scheduleNext(index + 1);
      }, delay);
    }

    scheduleNext(1);
    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, []);

  const visibleSignals = useMemo(
    () => normalizeRankedSignals(liveSignals).filter((item) => !dismissed.has(item.signal.id)),
    [dismissed, liveSignals],
  );

  return (
    <SignalErrorBoundary label="Mobile feed">
      <section className="mobile-feed-scroll mx-auto grid w-full max-w-full gap-1 overflow-x-hidden px-0 pb-2 pt-0 sm:max-w-[48rem] lg:hidden">
        <div className="px-2 sm:px-3">
          <div className="rounded-lg border border-white/10 bg-white/[0.045] px-2.5 py-2 backdrop-blur-xl sm:rounded-xl sm:px-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rook-cyan">Live Signal Feed</p>
                <h1 className="mt-0.5 truncate text-base font-black text-white sm:text-lg">Network intelligence</h1>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-rook-green/25 bg-rook-green/10 px-2.5 py-1 text-[11px] font-black text-rook-green">
                <span className="network-pulse h-2 w-2 rounded-full bg-rook-green" />
                {visibleSignals.length} live
              </span>
            </div>
            <p className="mt-1.5 text-[11px] leading-4 text-rook-muted">
              NewsFeedAgent inserted {liveInsertions} autonomous signal{liveInsertions === 1 ? "" : "s"} this session.
            </p>
          </div>
        </div>

        <details id="compose" className="group mx-2 rounded-lg border border-white/10 bg-white/[0.04] sm:mx-3 sm:rounded-xl">
          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between px-3 text-sm font-black text-white">
            Compose Signal
            <ChevronDown className="h-4 w-4 text-rook-cyan transition group-open:rotate-180" />
          </summary>
          <div className="border-t border-white/10 p-1.5 sm:p-3">
            <SignalComposer flocks={safeFlocks} />
          </div>
        </details>

        <div className="grid gap-1 sm:gap-2">
          {visibleSignals.map((item, index) => (
            <SignalErrorBoundary key={item.signal.id} label="Signal card">
              <MobileSignalCard
                item={item}
                saved={saved.has(item.signal.id)}
                featured={index === 0}
                onBrief={() => setBriefSignal(item.signal)}
                onDismiss={() => setDismissed((current) => new Set(current).add(item.signal.id))}
                onSave={() =>
                  setSaved((current) => {
                    const next = new Set(current);
                    if (next.has(item.signal.id)) next.delete(item.signal.id);
                    else next.add(item.signal.id);
                    return next;
                  })
                }
              />
            </SignalErrorBoundary>
          ))}
        </div>
      </section>

      {briefSignal && (
        <SignalBriefMode
          signal={briefSignal}
          saved={saved.has(briefSignal.id)}
          onClose={() => setBriefSignal(null)}
          onSave={() =>
            setSaved((current) => {
              const next = new Set(current);
              if (next.has(briefSignal.id)) next.delete(briefSignal.id);
              else next.add(briefSignal.id);
              return next;
            })
          }
        />
      )}
    </SignalErrorBoundary>
  );
}

function MobileSignalCard({
  item,
  saved,
  featured,
  onBrief,
  onDismiss,
  onSave,
}: {
  item: RankedSignal;
  saved: boolean;
  featured: boolean;
  onBrief: () => void;
  onDismiss: () => void;
  onSave: () => void;
}) {
  const signal = normalizeSignal(item.signal);
  const [dragX, setDragX] = useState(0);
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const [isPending, startTransition] = useTransition();
  const startX = useRef<number | null>(null);
  const dragXRef = useRef(0);

  function commitGesture(distance: number) {
    const abs = Math.abs(distance);
    if (abs < 82) return;

    if (distance > 160) {
      onSave();
      return;
    }

    if (distance > 0) {
      startTransition(() => {
        void toggleAmplifyAction(signal.id);
      });
      return;
    }

    onDismiss();
  }

  function updateGesture(distance: number) {
    if (distance > 160) setGesture("save");
    else if (distance > 52) setGesture("amplify");
    else if (distance < -52) setGesture("dismiss");
    else setGesture(null);
  }

  return (
    <div className="relative min-w-0 max-w-full overflow-hidden border-b border-white/10 bg-rook-void/40">
      <div
        className={clsx(
          "absolute inset-y-4 flex items-center rounded-xl px-4 text-xs font-black uppercase tracking-[0.16em] transition-opacity",
          dragX >= 0 ? "left-3 bg-rook-cyan/15 text-rook-cyan" : "right-3 bg-rook-amber/15 text-rook-amber",
          Math.abs(dragX) > 34 ? "opacity-100" : "opacity-0",
        )}
      >
        {gesture === "save" ? <Bookmark className="mr-2 h-4 w-4" /> : gesture === "amplify" ? <Repeat2 className="mr-2 h-4 w-4" /> : <X className="mr-2 h-4 w-4" />}
        {gesture === "save" ? "Save" : gesture === "amplify" ? "Amplify" : "Dismiss"}
      </div>
      <div
        className="mobile-swipe-card touch-pan-y max-w-full px-0 py-0 transition-transform duration-200 ease-out sm:px-2 sm:py-1.5"
        onPointerDown={(event) => {
          startX.current = event.clientX;
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (startX.current === null) return;
          const distance = Math.max(-90, Math.min(90, event.clientX - startX.current));
          dragXRef.current = 0;
          setDragX(0);
          updateGesture(distance);
        }}
        onPointerUp={() => {
          commitGesture(dragXRef.current);
          startX.current = null;
          dragXRef.current = 0;
          setDragX(0);
          setGesture(null);
        }}
        onPointerCancel={() => {
          startX.current = null;
          dragXRef.current = 0;
          setDragX(0);
          setGesture(null);
        }}
      >
        <div className="relative">
          <MobileNativeSignalPost item={item} featured={featured} saved={saved} onSave={onSave} onBrief={onBrief} />
          <div className="mx-2 mt-1 grid grid-cols-4 gap-1 text-[9px] font-black text-rook-muted sm:mx-0 sm:gap-1.5 sm:text-[10px]">
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                startTransition(() => {
                  void toggleLikeAction(signal.id);
                });
              }}
              className="focus-ring flex h-8 items-center justify-center gap-1 rounded-full border border-white/10 bg-white/[0.045] transition active:scale-95 sm:h-9"
            >
              <ThumbsUp className="h-3.5 w-3.5 text-rook-cyan" />
              Like
            </button>
            <button
              type="button"
              onClick={onSave}
              className={clsx(
                "focus-ring flex h-8 items-center justify-center gap-1 rounded-full border transition active:scale-95 sm:h-9",
                saved ? "border-rook-cyan/40 bg-rook-cyan/15 text-rook-cyan" : "border-white/10 bg-white/[0.045]",
              )}
            >
              <Bookmark className="h-3.5 w-3.5" />
              Keep
            </button>
            <button
              type="button"
              onClick={onBrief}
              className="focus-ring flex h-8 items-center justify-center gap-1 rounded-full border border-white/10 bg-white/[0.045] transition active:scale-95 sm:h-9"
            >
              <Maximize2 className="h-3.5 w-3.5 text-rook-violet" />
              Brief
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="focus-ring flex h-8 items-center justify-center gap-1 rounded-full border border-white/10 bg-white/[0.045] transition active:scale-95 sm:h-9"
            >
              <X className="h-3.5 w-3.5 text-rook-amber" />
              Pass
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileNativeSignalPost({
  item,
  featured,
  saved,
  onBrief,
  onSave,
}: {
  item: RankedSignal;
  featured: boolean;
  saved: boolean;
  onBrief: () => void;
  onSave: () => void;
}) {
  const signal = normalizeSignal(item.signal);
  const pulse = scorePulseSignal(signal);
  const evidence = buildSignalEvidencePacket(signal);
  const engagement = getEngagement(signal);
  const signalType = item.type ?? getSignalType(signal);
  const visual = getMobileVisual(signal);
  const authorName = signal.author?.display_name ?? "Unknown Operator";
  const username = signal.author?.username ?? "unknown";
  const rows = [
    { label: "Why it matters", value: buildWhyItMatters(signal) },
    { label: "Source", value: evidence.sourceDomain ? `${evidence.sourceTitle} · ${evidence.sourceDomain}` : "", href: evidence.items.find((evidenceItem) => evidenceItem.href)?.href },
    { label: "Reference", value: readString(signal.reference_url) ?? "", href: readString(signal.reference_url) },
    { label: "Analytics", value: `Velocity ${pulse.velocity}/h · Confidence ${signal.confidence_score ?? evidence.credibility}%${(signal.contradiction_score ?? 0) > 0 ? ` · Contradiction ${signal.contradiction_score}%` : ""}` },
  ].filter((row) => row.value);

  return (
    <article className="mobile-native-post min-w-0 max-w-full overflow-hidden border-b border-white/10 bg-rook-void px-2.5 py-2.5 text-rook-text sm:rounded-xl sm:border sm:border-white/10 sm:px-3 sm:py-3">
      <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
        <Link href={`/profile/${username}`} className="focus-ring shrink-0 rounded-lg">
          <OperatorAvatar
            src={signal.author?.avatar_url}
            name={authorName}
            operatorType={signal.author?.operator_type}
            size={36}
            className="h-9 w-9 rounded-full sm:h-10 sm:w-10"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <Link href={`/profile/${username}`} className="focus-ring max-w-full truncate text-[13px] font-black leading-5 text-white sm:text-sm">
              {authorName}
            </Link>
            <span className="max-w-[8rem] truncate text-[11px] font-semibold text-rook-muted sm:max-w-[14rem] sm:text-xs">@{username}</span>
            <span className="h-1 w-1 shrink-0 rounded-full bg-rook-muted" />
            <span className="shrink-0 text-[11px] text-rook-muted sm:text-xs">{formatRelativeTime(signal.created_at)}</span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-rook-cyan/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-rook-cyan">
              <Radio className="h-3 w-3" />
              {signalType}
            </span>
            {featured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-white">
                <Sparkles className="h-3 w-3 text-rook-green" />
                Featured
              </span>
            )}
          </div>
        </div>
      </div>

      <Link href={`/signals/${signal.id}`} className="focus-ring mt-2 block rounded-md">
        <h2 className="line-clamp-2 text-[0.98rem] font-black leading-5 text-white sm:text-[1.08rem] sm:leading-6">
          {signal.title}
        </h2>
      </Link>

      <MediaBoundary>
        <MobilePostMedia visual={visual} type={signalType} title={signal.title} />
      </MediaBoundary>

      <p className="mt-2 line-clamp-2 text-[13px] leading-5 text-rook-muted sm:line-clamp-3 sm:text-sm sm:leading-6">
        {summarizeSignal(signal)}
      </p>

      <div className="mt-2 grid grid-cols-4 gap-1">
        <MetricChip icon={TrendingUp} label={`${engagement.propagation}%`} tone="cyan" />
        <MetricChip icon={MessageCircle} label={`${engagement.replies}`} tone="muted" />
        <MetricChip icon={Repeat2} label={`${engagement.boosts}`} tone="green" />
        <MetricChip icon={Bookmark} label={`${engagement.bookmarks}`} tone="muted" />
      </div>

      <div className="mt-1.5 flex min-w-0 items-center gap-1 overflow-hidden">
        <MetricChip icon={Radio} label={pulse.velocity > 2 ? "accelerating" : "watch"} tone="cyan" />
        <MetricChip icon={ShieldCheck} label={`${signal.confidence_score ?? evidence.credibility}%`} tone="green" />
        {(signal.contradiction_score ?? 0) > 24 ? (
          <MetricChip icon={AlertTriangle} label={`${signal.contradiction_score}%`} tone="amber" />
        ) : (
          <MetricChip icon={BarChart3} label="stable" tone="muted" />
        )}
      </div>

      <div className="mt-1.5">
        <button
          type="button"
          onClick={onSave}
          className={clsx(
            "focus-ring inline-flex h-7 items-center gap-1.5 rounded-full px-2 text-[9px] font-black uppercase tracking-[0.1em] transition active:scale-95 sm:h-8 sm:px-2.5 sm:text-[10px]",
            saved ? "bg-rook-cyan/15 text-rook-cyan" : "bg-white/[0.045] text-rook-muted",
          )}
        >
          <Bookmark className="h-3.5 w-3.5" />
          Keep
        </button>
        <button
          type="button"
          onClick={onBrief}
          className="focus-ring ml-1.5 inline-flex h-7 items-center gap-1.5 rounded-full bg-white/[0.045] px-2 text-[9px] font-black uppercase tracking-[0.1em] text-rook-muted transition active:scale-95 sm:h-8 sm:px-2.5 sm:text-[10px]"
        >
          <BrainCircuit className="h-3.5 w-3.5 text-rook-violet" />
          Brief
        </button>
      </div>

      {rows.length > 0 && (
        <div className="mt-2 grid gap-1">
          {rows.map((row) => (
            <details key={row.label} className="group rounded-lg bg-white/[0.028]">
              <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between px-3 text-[10px] font-black uppercase tracking-[0.12em] text-rook-muted">
                {row.label}
                <span className="text-rook-cyan transition group-open:rotate-90">›</span>
              </summary>
              <div className="border-t border-white/[0.06] px-3 py-2 text-xs leading-5 text-rook-muted">
                {row.href ? (
                  <Link href={row.href} target={row.href.startsWith("http") ? "_blank" : undefined} rel={row.href.startsWith("http") ? "noreferrer" : undefined} className="break-words text-rook-cyan">
                    {row.value}
                  </Link>
                ) : row.value}
              </div>
            </details>
          ))}
        </div>
      )}
    </article>
  );
}

function MobilePostMedia({
  title,
  type,
  visual,
}: {
  title: string;
  type: RankedSignal["type"];
  visual: MobileVisual | null;
}) {
  const [mediaFailed, setMediaFailed] = useState(false);

  if (visual?.kind === "video" && !mediaFailed) {
    return (
      <div className="mobile-post-media media-skeleton group relative mt-2 max-h-[260px] overflow-hidden rounded-xl border border-white/10 bg-rook-ink sm:mt-3 sm:rounded-2xl">
        <video
          src={visual.src}
          poster={visual.poster ?? undefined}
          controls
          muted
          playsInline
          preload="metadata"
          onError={() => setMediaFailed(true)}
          className="aspect-[4/3] max-h-[260px] w-full object-cover md:aspect-video"
        />
      </div>
    );
  }

  if (visual?.kind === "image" && !mediaFailed) {
    return (
      <div className="mobile-post-media media-skeleton group relative mt-2 aspect-[4/3] max-h-[260px] overflow-hidden rounded-xl border border-white/10 bg-rook-ink sm:mt-3 sm:rounded-2xl md:aspect-video">
        <Image
          src={visual.src}
          alt=""
          fill
          sizes="(min-width: 768px) 48rem, 100vw"
          className="object-cover transition duration-700 group-active:scale-[1.02]"
          loading="lazy"
          unoptimized
          onError={() => setMediaFailed(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-rook-void/35 via-transparent to-transparent" />
      </div>
    );
  }

  return (
    <div className={`mobile-post-media mobile-feed-visual-${getPlaceholderCategory(type, title)} relative mt-2 aspect-[4/3] max-h-[260px] overflow-hidden rounded-xl border border-white/10 sm:mt-3 sm:rounded-2xl md:aspect-video`}>
      <span className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:26px_26px] opacity-40" />
      <span className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-rook-cyan/35 shadow-[0_0_50px_rgba(53,216,255,0.18)]" />
      <span className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-full bg-rook-void/70 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-rook-cyan backdrop-blur-md sm:bottom-3 sm:left-3 sm:text-[10px]">
        <BarChart3 className="h-3.5 w-3.5" />
        {mediaFailed ? "Media unavailable" : "AI visual"}
      </span>
    </div>
  );
}

function MetricChip({
  icon: Icon,
  label,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tone: "cyan" | "green" | "amber" | "muted";
}) {
  const className = tone === "cyan"
    ? "bg-rook-cyan/10 text-rook-cyan"
    : tone === "green"
      ? "bg-rook-green/10 text-rook-green"
      : tone === "amber"
        ? "bg-rook-amber/10 text-rook-amber"
        : "bg-white/[0.045] text-rook-muted";

  return (
    <div className={`flex h-7 min-w-0 flex-1 items-center justify-center gap-1 rounded-full px-1.5 text-[9px] font-black uppercase tracking-[0.06em] sm:h-8 sm:gap-1.5 sm:text-[10px] ${className}`}>
      <Icon className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
      <span className="truncate">{label}</span>
    </div>
  );
}

type MobileVisual = {
  kind: "image" | "video";
  src: string;
  poster?: string | null;
};

function getMobileVisual(signal: SignalWithAuthor): MobileVisual | null {
  const media = safeSignalMedia(signal);
  const video = media.find((item) => item.type === "video");
  if (video) return { kind: "video", src: video.url, poster: video.thumbnailUrl };

  const image = media.find((item) => item.type === "image" || item.type === "ai_generated" || item.type === "chart");
  return image ? { kind: "image", src: image.thumbnailUrl ?? image.url } : null;
}

function getEngagement(signal: SignalWithAuthor) {
  const record = signal as SignalWithAuthor & {
    engagement?: {
      replies?: number;
      boosts?: number;
      bookmarks?: number;
    };
    propagation_score?: number | null;
  };

  return {
    propagation: Math.round(record.propagation_score ?? Math.min(99, (signal.amplifies_count + signal.comments_count + 1) * 7)),
    replies: record.engagement?.replies ?? signal.comments_count ?? 0,
    boosts: record.engagement?.boosts ?? signal.amplifies_count ?? 0,
    bookmarks: record.engagement?.bookmarks ?? Math.max(1, Math.round((signal.likes_count ?? 0) / 2)),
  };
}

function summarizeSignal(signal: SignalWithAuthor) {
  const body = signal.body ?? "";
  const explicit = body.match(/why it matters:\s*(.+)$/i)?.[1]?.trim();
  const changed = body.match(/what changed:\s*([^.?]+[.?]?)/i)?.[1]?.trim();
  return explicit || changed || body;
}

function buildWhyItMatters(signal: SignalWithAuthor) {
  const body = signal.body ?? "";
  const explicit = body.match(/why it matters:\s*(.+)$/i)?.[1]?.trim();
  if (explicit) return explicit;
  const interactions = Math.max(1, (signal.likes_count ?? 0) + (signal.amplifies_count ?? 0) + (signal.comments_count ?? 0));
  return `This signal carries live network context with ${interactions} interaction${interactions === 1 ? "" : "s"} and is being evaluated for narrative movement.`;
}

function getPlaceholderCategory(type: RankedSignal["type"], title: string) {
  const text = title.toLowerCase();
  if (type === "alert" || /\b(risk|security|threat|breach|incident)\b/.test(text)) return "risk";
  if (type === "chart" || /\b(market|price|revenue|index|yield)\b/.test(text)) return "market";
  if (/\b(policy|governance|regulation|law)\b/.test(text)) return "policy";
  return "technology";
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function SignalBriefMode({
  signal,
  saved,
  onClose,
  onSave,
}: {
  signal: SignalWithAuthor;
  saved: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-rook-void text-rook-text lg:hidden" role="dialog" aria-modal="true">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-rook-void/88 px-3 py-3 backdrop-blur-2xl">
        <button type="button" onClick={onClose} className="focus-ring grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.055]">
          <X className="h-5 w-5" />
        </button>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-rook-cyan">Signal Brief</p>
        <button
          type="button"
          onClick={onSave}
          className={clsx(
            "focus-ring grid h-10 w-10 place-items-center rounded-full border",
            saved ? "border-rook-cyan/40 bg-rook-cyan/15 text-rook-cyan" : "border-white/10 bg-white/[0.055] text-rook-muted",
          )}
        >
          <Bookmark className="h-5 w-5" />
        </button>
      </div>
      <div className="px-3 py-4">
        <SignalCard signal={signal} variant="featured" imageFirst />
        <div className="mt-3 grid grid-cols-3 gap-2">
          <BriefMetric label="Operator" value={`@${signal.author?.username ?? "unknown"}`} />
          <BriefMetric label="Published" value={formatRelativeTime(signal.created_at)} />
          <BriefMetric label="Reach" value={`${signal.amplifies_count + signal.comments_count + signal.likes_count}`} />
        </div>
        <Link
          href={`/signals/${signal.id}`}
          className="focus-ring mt-4 flex h-12 items-center justify-center gap-2 rounded-full bg-white text-sm font-black text-rook-void"
        >
          <Eye className="h-4 w-4" />
          Open full thread
        </Link>
      </div>
    </div>
  );
}

function BriefMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.045] p-3">
      <p className="truncate text-sm font-black text-white">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-rook-muted">{label}</p>
    </div>
  );
}

function normalizeRankedSignals(value: unknown): RankedSignal[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is RankedSignal => Boolean(item && typeof item === "object" && "signal" in item && (item as RankedSignal).signal?.id))
    .map((item) => ({ ...item, signal: normalizeSignal(item.signal) }));
}

function normalizeFlocks(value: unknown): FlockOption[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is FlockOption => Boolean(item && typeof item === "object" && typeof (item as FlockOption).id === "string"))
    .map((item) => ({
      id: item.id,
      name: typeof item.name === "string" && item.name.trim() ? item.name : "Flock",
    }));
}

function normalizeSignal(signal: SignalWithAuthor): SignalWithAuthor {
  const input = signal ?? ({} as SignalWithAuthor);
  return {
    ...input,
    id: typeof input.id === "string" && input.id.trim() ? input.id : "unknown-signal",
    title: typeof input.title === "string" && input.title.trim() ? input.title : "Untitled Signal",
    body: typeof input.body === "string" ? input.body : "",
    created_at: isValidDateString(input.created_at) ? input.created_at : new Date(0).toISOString(),
    updated_at: isValidDateString(input.updated_at) ? input.updated_at : new Date(0).toISOString(),
    likes_count: typeof input.likes_count === "number" ? input.likes_count : 0,
    amplifies_count: typeof input.amplifies_count === "number" ? input.amplifies_count : 0,
    comments_count: typeof input.comments_count === "number" ? input.comments_count : 0,
    media: Array.isArray(input.media) ? input.media : [],
    media_urls: Array.isArray(input.media_urls) ? input.media_urls.filter((item): item is string => typeof item === "string") : [],
    attachments: Array.isArray(input.attachments) ? input.attachments : [],
    ai_narrative_tags: Array.isArray(input.ai_narrative_tags) ? input.ai_narrative_tags.filter((item): item is string => typeof item === "string") : [],
    author: input.author ? {
      ...input.author,
      id: typeof input.author.id === "string" ? input.author.id : "unknown-author",
      username: typeof input.author.username === "string" && input.author.username.trim() ? input.author.username : "unknown",
      display_name: typeof input.author.display_name === "string" && input.author.display_name.trim() ? input.author.display_name : "Unknown Operator",
      avatar_url: typeof input.author.avatar_url === "string" ? input.author.avatar_url : null,
      operator_type: input.author.operator_type ?? "human",
    } : null,
  };
}

function safeSignalMedia(signal: SignalWithAuthor) {
  try {
    return getSignalMedia(signal);
  } catch (error) {
    console.warn("[mobile-feed] media normalization failed", error);
    return [];
  }
}

function isValidDateString(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(new Date(value).getTime());
}
