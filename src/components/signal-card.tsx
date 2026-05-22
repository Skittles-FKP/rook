"use client";

import Link from "next/link";
import Image from "next/image";
import { AlertTriangle, BarChart3, Bookmark, Bot, BrainCircuit, Clock3, Eye, Gauge, GitBranch, ImageIcon, Link2, MessageCircle, MoreHorizontal, Network, Repeat2, Route, ShieldAlert, ShieldCheck, Sparkles, ThumbsUp, TrendingUp } from "lucide-react";
import { OperatorAvatar } from "@/components/operator-avatar";
import { VerificationBadge } from "@/components/profile/verification-badge";
import { SignalActions } from "@/components/signals/signal-actions";
import { ShareSignalButton } from "@/components/signals/share-signal-button";
import { SignalEvidenceSection } from "@/components/signals/signal-evidence-section";
import { SignalIntelligencePanel } from "@/components/signals/signal-intelligence-panel";
import { SignalMedia } from "@/components/signals/signal-media";
import { MediaBoundary } from "@/components/signals/signal-error-boundary";
import { formatRelativeTime } from "@/lib/format";
import { getSignalMedia, shouldUseSyntheticSignalMedia } from "@/lib/media";
import { scorePulseSignal } from "@/lib/pulse";
import { getOperatorStyle } from "@/lib/operator-style";
import { buildSignalEvidencePacket } from "@/lib/signal-evidence";
import { deriveSignalContinuity } from "@/lib/signal-continuity";
import { getSignalType, type SignalSize, type SignalType } from "@/lib/feed-ranking";
import type { SignalWithAuthor } from "@/lib/supabase/types";

type SignalCardProps = {
  signal: SignalWithAuthor;
  variant?: "featured" | "standard" | "compact";
  size?: SignalSize;
  signalType?: SignalType;
  rhythm?: "visual" | "brief" | "dense" | "scan" | "pulse";
  imageFirst?: boolean;
};

export function SignalCard({
  signal,
  variant = "standard",
  size,
  signalType,
  rhythm = "dense",
  imageFirst = false,
}: SignalCardProps) {
  const safeSignal = normalizeRenderableSignal(signal);
  const authorName = safeSignal.author?.display_name ?? "Unknown Operator";
  const username = safeSignal.author?.username ?? "unknown";
  const pulse = scorePulseSignal(safeSignal);
  const pulseLabels = safeArray(pulse.pulse_labels).slice(0, 2);
  const topicTerms = safeArray(pulse.topic_terms).slice(0, 2);
  const authorIsAi = safeSignal.author?.operator_type === "ai_agent" || safeSignal.author?.operator_type === "autonomous";
  const syntheticMediaAllowed = shouldUseSyntheticSignalMedia(safeSignal);
  const specialization = safeArray(safeSignal.author?.expertise_domains)[0] ?? safeSignal.author?.autonomous_status ?? null;
  const evidenceCount = [
    safeSignal.cover_image,
    safeSignal.thumbnail,
    safeSignal.reference_url,
    safeSignal.image_url,
    safeSignal.video_url,
    safeSignal.chart_url,
    safeSignal.embed_url,
    safeSignal.media_url,
    ...safeArray(safeSignal.media_urls),
    ...safeArray(safeSignal.media),
    ...safeArray(safeSignal.attachments),
  ].filter(Boolean).length;
  const briefSnippet = buildBriefSnippet(safeSignal.body);
  const whyItMatters = buildWhyItMatters(safeSignal);
  const narrativeLabels = [...new Set([...safeArray(safeSignal.ai_narrative_tags), ...safeArray(pulse.topic_terms)])].slice(0, 4);
  const evidencePacket = buildSignalEvidencePacket(safeSignal);
  const operatorStyle = getOperatorStyle(username);
  const continuity = deriveSignalContinuity(safeSignal, pulse);
  const continuityDeltas = safeArray(continuity.deltas);
  const escalationLevel = getEscalationLevel({
    pulse: pulse.pulse_score,
    contradiction: safeSignal.contradiction_score ?? 0,
    velocity: pulse.velocity,
  });
  const ringValue = Math.min(100, Math.max(8, safeSignal.confidence_score ?? Math.round(55 + pulse.pulse_score / 3)));

  const resolvedSize: SignalSize = size ?? (variant === "featured" ? "FEATURED" : variant === "compact" ? "SM" : "MD");
  const resolvedType = signalType ?? getSignalType(safeSignal);
  const compact = resolvedSize === "XS" || resolvedSize === "SM" || variant === "compact";
  const featured = resolvedSize === "FEATURED" || variant === "featured";
  const showIntel = resolvedSize === "MD" || resolvedSize === "LG" || featured;
  const showDeepIntel = resolvedSize === "LG" || featured;
  const showMedia = imageFirst || resolvedSize !== "XS";
  const sizeConfig = getSizeConfig(resolvedSize);
  const articleClass = `rook-signal-card surface-card rook-live-card intelligence-packet compact-mobile signal-size-${resolvedSize.toLowerCase()} signal-rhythm-${rhythm} w-full min-w-0 overflow-hidden rounded-xl ${sizeConfig.padding} transition duration-200 hover:border-rook-blue/40 ${operatorStyle.aura}`;
  const bodyLimit = sizeConfig.bodyLimit;
  const visualUrl = getSignalVisualUrl(safeSignal);
  const sourceRows = buildMobileAccordionRows({
    signal: safeSignal,
    whatChanged: briefSnippet,
    whyItMatters,
    evidencePacket,
  });

  const media = (
    <MediaBoundary>
      <SignalMedia signal={safeSignal} compact={compact} fallback={syntheticMediaAllowed} />
    </MediaBoundary>
  );

  return (
    <article className={articleClass}>
      <div className={`mb-3 h-1 rounded-full bg-gradient-to-r ${operatorStyle.accent}`} />
      <div className="mb-3 flex items-center justify-between gap-2">
        <SignalTypePill type={resolvedType} />
        <button type="button" aria-label="Signal options" className="focus-ring grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/[0.035] text-rook-muted transition hover:text-white">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
      {imageFirst && showMedia && <div className="hidden md:block">{media}</div>}
      <div className="flex min-w-0 gap-3">
        <Link href={`/profile/${username}`} className="focus-ring shrink-0 rounded-lg">
          <OperatorAvatar
            src={safeSignal.author?.avatar_url}
            name={authorName}
            operatorType={safeSignal.author?.operator_type}
            size={44}
            className="h-10 w-10 sm:h-11 sm:w-11 sm:text-sm"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link href={`/profile/${username}`} className="focus-ring inline-flex min-w-0 items-center gap-1 rounded-md font-bold text-white hover:text-rook-cyan">
              <span className="min-w-0 truncate">{authorName}</span>
              <VerificationBadge subject={safeSignal.author} />
            </Link>
            {authorIsAi && (
              <OperatorBadge label={operatorStyle.signature} className={operatorStyle.chip} />
            )}
            <p className="text-sm text-rook-muted">@{username}</p>
            {specialization && (
              <>
                <span className="h-1 w-1 rounded-full bg-rook-muted" />
                <p className="text-sm text-rook-muted">{specialization}</p>
              </>
            )}
            <span className="h-1 w-1 rounded-full bg-rook-muted" />
            <p className="text-sm text-rook-muted">{formatRelativeTime(safeSignal.created_at)}</p>
          </div>
          {authorIsAi && (
            <p className="mt-2 text-xs font-semibold text-rook-muted">{operatorStyle.tone}</p>
          )}
        </div>
      </div>

      {!imageFirst && showMedia && <div className="hidden md:block">{media}</div>}

      <Link href={getSignalDetailHref(safeSignal)} className="focus-ring mt-4 block rounded-md">
        <h2 className={`mobile-clamp-title mobile-readable font-black text-white hover:text-rook-cyan ${sizeConfig.titleClass}`}>
          {safeSignal.title}
        </h2>
      </Link>
      <p className={`mobile-clamp-body mobile-readable mt-2 text-sm leading-6 text-rook-muted ${compact ? "" : "sm:text-base sm:leading-7"}`}>{truncateText(safeSignal.body, bodyLimit)}</p>

      <MobileSignalVisual signal={safeSignal} type={resolvedType} src={visualUrl} />

      {sourceRows.length > 0 && (
        <div className="mobile-intel-accordion mt-3 grid gap-1 md:hidden">
          {sourceRows.map((row) => (
            <details key={row.label} className="group overflow-hidden rounded-lg border border-white/10 bg-white/[0.035]">
              <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-3 px-3 text-[11px] font-black uppercase tracking-[0.12em] text-rook-muted">
                {row.label}
                <span className="text-rook-cyan transition group-open:rotate-90">›</span>
              </summary>
              <div className="border-t border-white/10 px-3 py-2 text-xs leading-5 text-rook-muted">
                {row.href ? (
                  <Link href={row.href} target={row.href.startsWith("http") ? "_blank" : undefined} rel={row.href.startsWith("http") ? "noreferrer" : undefined} className="text-rook-cyan">
                    {row.value}
                  </Link>
                ) : row.value}
              </div>
            </details>
          ))}
        </div>
      )}

      {showIntel && (
        <div className="mt-3 hidden md:block">
          <div className="flex flex-wrap items-center gap-2">
            <span className={escalationLevel === "critical" ? "rook-topic-chip rounded-full bg-rook-amber/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-rook-amber" : escalationLevel === "rising" ? "rook-topic-chip rounded-full bg-rook-cyan/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-rook-cyan" : "rook-topic-chip rounded-full bg-white/[0.04] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-rook-muted"}>
              {escalationLevel === "critical" ? "Critical" : escalationLevel === "rising" ? "Accelerating" : "Watch"}
            </span>
            {pulse.pulse_score >= 58 && <PulseTag hot label="Pulse hot" />}
            <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.04] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-rook-muted">
              <Gauge className="h-3.5 w-3.5 text-rook-green" />
              v{pulse.velocity}/h
            </span>
            {(safeSignal.contradiction_score ?? 0) > 28 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rook-amber/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-rook-amber">
                <AlertTriangle className="h-3.5 w-3.5" />
                contradiction {safeSignal.contradiction_score}%
              </span>
            )}
          </div>
          <DesktopIntelRows
            rows={[
              { label: "What changed", value: briefSnippet },
              { label: "Why it matters", value: whyItMatters },
              { label: "Source", value: `${evidencePacket.sourceTitle} · ${evidencePacket.sourceDomain}` },
            ]}
          />
        </div>
      )}

      <div className={`mt-4 hidden gap-2 md:grid ${compact ? "grid-cols-2" : "sm:grid-cols-3"}`}>
        <EvidenceMetric icon={Link2} label="Evidence" value={evidenceCount > 0 ? `${evidenceCount} source${evidenceCount === 1 ? "" : "s"}` : "internal graph"} />
        <EvidenceMetric icon={TrendingUp} label="Pulse acceleration" value={pulse.acceleration > 0 ? `+${pulse.acceleration}` : "stable"} />
        {showIntel && <EvidenceMetric icon={ShieldCheck} label="Source credibility" value={`${evidencePacket.credibility}%`} />}
      </div>
      {showDeepIntel && <ContinuityStrip continuity={{ ...continuity, deltas: continuityDeltas }} />}
      {showDeepIntel && <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-[auto_1fr]">
        <div
          className="grid h-14 w-14 place-items-center rounded-full border border-white/10 bg-white/[0.035] text-xs font-black text-white"
          style={{ background: `conic-gradient(rgba(46,232,159,0.85) ${ringValue * 3.6}deg, rgba(255,255,255,0.08) 0deg)` }}
          aria-label={`Confidence ${ringValue}%`}
        >
          <span className="grid h-10 w-10 place-items-center rounded-full bg-rook-void">{ringValue}%</span>
        </div>
        <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rook-cyan">Related Narratives</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {safeArray(narrativeLabels).slice(0, 4).map((label) => (
              <Link key={label} href={`/narratives?focus=${encodeURIComponent(label)}`} className="rounded-full border border-white/10 bg-rook-void/40 px-2.5 py-1 text-[11px] font-bold text-rook-muted transition hover:text-white">
                {label.replace(/^operator:/, "@")}
              </Link>
            ))}
          </div>
        </div>
      </div>}
      {showDeepIntel && <SignalEvidenceSection signal={safeSignal} />}
      <div className="mt-4 hidden min-w-0 flex-wrap gap-2 md:flex">
        {safeSignal.flock && (
          <span className="rounded-full border border-rook-blue/30 bg-rook-blue/10 px-3 py-1 text-xs font-bold text-rook-cyan">
            {safeSignal.flock.name}
          </span>
        )}
        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-rook-muted">
          <Sparkles className="h-3.5 w-3.5" />
          Brief-ready
        </span>
        {pulseLabels.map((label) => (
          <span key={label} className="rounded-full border border-rook-green/25 bg-rook-green/10 px-3 py-1 text-xs font-black text-rook-green">
            {label}
          </span>
        ))}
        {pulse.velocity > 0 && (
          <span className="rounded-full border border-rook-amber/25 bg-rook-amber/10 px-3 py-1 text-xs font-bold text-rook-amber">
            v{pulse.velocity}/h
          </span>
        )}
        {typeof safeSignal.confidence_score === "number" && (
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-rook-muted">
            <ShieldCheck className="h-3.5 w-3.5 text-rook-green" />
            {safeSignal.confidence_score}% confidence
          </span>
        )}
        {topicTerms.map((term) => (
          <span key={term} className="inline-flex items-center gap-1 rounded-full border border-rook-violet/25 bg-rook-violet/10 px-3 py-1 text-xs font-bold text-rook-muted">
            <Network className="h-3.5 w-3.5 text-rook-violet" />
            {term}
          </span>
        ))}
        {safeArray(narrativeLabels).slice(0, 3).map((label) => (
          <Link key={label} href={`/graph?focus=${encodeURIComponent(label)}`} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-rook-muted transition hover:border-rook-cyan/30 hover:text-white">
            <GitBranch className="h-3.5 w-3.5 text-rook-cyan" />
            {label.replace(/^operator:/, "@")}
          </Link>
        ))}
      </div>
      {showDeepIntel && <SignalIntelligencePanel signal={safeSignal} />}
      <SignalEngagementRow signal={safeSignal} />
      <div className="hidden md:block">
        <SignalActions
          signalId={safeSignal.id}
          likes={safeSignal.likes_count}
          amplifies={safeSignal.amplifies_count}
          comments={safeSignal.comments_count}
          liked={Boolean(safeSignal.viewer_has_liked)}
          amplified={Boolean(safeSignal.viewer_has_amplified)}
        />
      </div>
    </article>
  );
}

function SignalTypePill({ type }: { type: SignalType }) {
  const Icon = type === "alert"
    ? ShieldAlert
    : type === "chart"
      ? BarChart3
      : type === "graph"
        ? Route
        : type === "narrative"
          ? GitBranch
          : type === "intelligence brief"
            ? BrainCircuit
            : ImageIcon;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-rook-cyan/20 bg-rook-cyan/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-rook-cyan">
      <Icon className="h-3.5 w-3.5" />
      {type}
    </span>
  );
}

function OperatorBadge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase ${className}`}>
      <Bot className="h-3 w-3" />
      {label}
    </span>
  );
}

function PulseTag({ label, hot = false }: { label: string; hot?: boolean }) {
  return (
    <span className={hot ? "rook-pulse-hot inline-flex items-center gap-1 rounded-full border border-rook-amber/30 bg-rook-amber/[0.12] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-rook-amber" : "inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-rook-muted"}>
      <Sparkles className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function SignalEngagementRow({ signal }: { signal: SignalWithAuthor }) {
  const views = estimateSignalViews(signal);
  const items = [
    { label: "Replies", value: signal.comments_count, icon: MessageCircle },
    { label: "Boosts", value: signal.amplifies_count, icon: Repeat2 },
    { label: "Likes", value: signal.likes_count, icon: ThumbsUp },
    { label: "Views", value: views, icon: Eye },
  ];

  return (
    <div className="rook-signal-engagement-row mt-3 grid grid-cols-5 gap-1.5 border-t border-white/10 pt-3 text-[11px] font-bold text-rook-muted">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.label}
            href={`${getSignalDetailHref(signal)}${item.label === "Replies" && isUuid(signal.id) ? "#comments" : ""}`}
            aria-label={`${item.label}: ${formatCompactNumber(item.value)}`}
            className="focus-ring inline-flex min-h-9 min-w-0 items-center justify-center gap-1 rounded-full bg-white/[0.035] px-1.5 transition hover:bg-white/[0.06] hover:text-white"
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-rook-cyan" />
            <span className="truncate">{formatCompactNumber(item.value)}</span>
          </Link>
        );
      })}
      <div className="grid grid-cols-2 gap-1">
        <button type="button" aria-label="Save Signal" className="focus-ring grid min-h-9 place-items-center rounded-full bg-white/[0.035] transition hover:bg-white/[0.06] hover:text-white">
          <Bookmark className="h-3.5 w-3.5 text-rook-muted" />
        </button>
        <ShareSignalButton signalId={signal.id} title={signal.title} compact />
      </div>
    </div>
  );
}

function estimateSignalViews(signal: SignalWithAuthor) {
  const explicit = (signal as SignalWithAuthor & { engagement?: { views?: number } }).engagement?.views;
  if (typeof explicit === "number" && Number.isFinite(explicit)) return explicit;
  return Math.max(12, (signal.likes_count * 8) + (signal.amplifies_count * 15) + (signal.comments_count * 11));
}

function getSignalDetailHref(signal: SignalWithAuthor) {
  if (isUuid(signal.id)) return `/signals/${signal.id}`;
  return signal.source_url || signal.reference_url || "/feed";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function formatCompactNumber(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(Math.max(0, Math.round(value)));
}

function getSizeConfig(size: SignalSize) {
  switch (size) {
    case "XS":
      return { padding: "p-3", titleClass: "text-base leading-6", bodyLimit: 120 };
    case "SM":
      return { padding: "p-3 sm:p-4", titleClass: "text-lg leading-6", bodyLimit: 180 };
    case "LG":
      return { padding: "p-3 sm:p-5", titleClass: "text-xl leading-7 sm:text-2xl sm:leading-8", bodyLimit: 360 };
    case "FEATURED":
      return { padding: "p-3 sm:p-5 lg:p-6", titleClass: "text-2xl leading-8 sm:text-3xl sm:leading-9", bodyLimit: 460 };
    case "MD":
    default:
      return { padding: "p-3 sm:p-5", titleClass: "text-xl leading-7", bodyLimit: 260 };
  }
}

function DesktopIntelRows({ rows }: { rows: Array<{ label: string; value: string }> }) {
  const visibleRows = rows.filter((row) => row.value.trim().length > 0);
  if (visibleRows.length === 0) return null;

  return (
    <div className="mt-3 grid gap-1.5">
      {visibleRows.map((row, index) => (
        <details key={row.label} open={index === 0} className="group rounded-lg bg-white/[0.028] transition hover:bg-white/[0.045]">
          <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-3 px-3 text-[10px] font-black uppercase tracking-[0.14em] text-rook-muted">
            {row.label}
            <span className="text-rook-cyan transition group-open:rotate-90">›</span>
          </summary>
          <p className="border-t border-white/[0.06] px-3 py-2 text-xs leading-5 text-rook-muted">
            {row.value}
          </p>
        </details>
      ))}
    </div>
  );
}

function MobileSignalVisual({
  signal,
  src,
  type,
}: {
  signal: SignalWithAuthor;
  src: string | null;
  type: SignalType;
}) {
  const category = getVisualCategory(signal, type);

  if (src) {
    return (
      <div className="mobile-rich-visual mt-3 md:hidden">
        <Image src={src} alt="" fill sizes="100vw" className="object-cover" unoptimized />
      </div>
    );
  }

  return (
    <div className={`mobile-rich-visual mobile-visual-${category} mt-3 md:hidden`} aria-hidden="true">
      <span className="mobile-visual-grid" />
      <span className="mobile-visual-core" />
      <span className="mobile-visual-line mobile-visual-line-a" />
      <span className="mobile-visual-line mobile-visual-line-b" />
    </div>
  );
}

function buildMobileAccordionRows({
  evidencePacket,
  signal,
  whatChanged,
  whyItMatters,
}: {
  evidencePacket: ReturnType<typeof buildSignalEvidencePacket>;
  signal: SignalWithAuthor;
  whatChanged: string;
  whyItMatters: string;
}) {
  const rows: Array<{ label: string; value: string; href?: string | null }> = [];
  const referenceUrl = readString(signal.reference_url) ?? readString(signal.embed_url);
  const chartUrl = readString(signal.chart_url);
  const sourceHref = evidencePacket.items.find((item) => item.href)?.href ?? referenceUrl ?? chartUrl;

  if (whatChanged) rows.push({ label: "What changed", value: whatChanged });
  if (whyItMatters) rows.push({ label: "Why it matters", value: whyItMatters });
  if (sourceHref && evidencePacket.sourceDomain) {
    rows.push({
      label: "Source",
      value: `${evidencePacket.sourceTitle} · ${evidencePacket.sourceDomain}`,
      href: sourceHref,
    });
  }
  if (referenceUrl) rows.push({ label: "Reference", value: referenceUrl, href: referenceUrl });
  if (chartUrl) rows.push({ label: "Chart", value: chartUrl, href: chartUrl });

  return rows;
}

function getSignalVisualUrl(signal: SignalWithAuthor) {
  const visual = getSignalMedia(signal).find((media) => media.type === "image" || media.type === "ai_generated" || media.type === "chart");
  return visual?.thumbnailUrl ?? visual?.url ?? null;
}

function getVisualCategory(signal: SignalWithAuthor, type: SignalType) {
  const text = `${signal.title} ${signal.body} ${(signal.ai_narrative_tags ?? []).join(" ")}`.toLowerCase();
  if (type === "chart" || /\b(markets?|stocks?|revenue|pricing|yield|inflation|chart)\b/.test(text)) return "markets";
  if (type === "alert" || /\b(security|risk|threat|breach|attack|incident|outage)\b/.test(text)) return "risk";
  if (/\b(policy|governance|regulation|regulatory|parliament|senate|law)\b/.test(text)) return "policy";
  if (/\b(ai|compute|chip|model|network|technology|infrastructure)\b/.test(text)) return "technology";
  return type === "graph" ? "technology" : "markets";
}

function ContinuityStrip({
  continuity,
}: {
  continuity: ReturnType<typeof deriveSignalContinuity>;
}) {
  const reference = continuity.previousReference ?? "Prior state is being established for this narrative.";

  return (
    <div className="mt-3 rounded-lg border border-rook-blue/20 bg-rook-blue/5 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-rook-cyan/25 bg-rook-cyan/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-rook-cyan">
          <Clock3 className="h-3.5 w-3.5" />
          {continuity.state}
        </span>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-rook-muted">
          age {continuity.narrativeAgeHours.toFixed(1)}h
        </span>
        {safeArray(continuity.deltas).map((delta) => (
          <span
            key={`${delta.label}-${delta.value}`}
            className={delta.tone === "positive"
              ? "rounded-full border border-rook-amber/25 bg-rook-amber/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-rook-amber"
              : delta.tone === "negative"
                ? "rounded-full border border-rook-green/25 bg-rook-green/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-rook-green"
                : "rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-rook-muted"}
          >
            {delta.label} {delta.value}
          </span>
        ))}
      </div>
      <p className="mt-2 text-xs leading-5 text-rook-muted">{reference}</p>
    </div>
  );
}

function EvidenceMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-rook-void/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <Icon className="h-4 w-4 text-rook-cyan" />
        <p className="truncate text-xs font-black text-white">{value}</p>
      </div>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-rook-muted">{label}</p>
    </div>
  );
}

function buildBriefSnippet(body: string) {
  const whatChanged = body.match(/what changed:\s*([^.?]+[.?]?)/i)?.[1]?.trim();
  return truncateText(whatChanged || body, 170);
}

function buildWhyItMatters(signal: SignalWithAuthor) {
  const explicit = signal.body.match(/why it matters:\s*(.+)$/i)?.[1]?.trim();
  if (explicit) return truncateText(explicit, 170);

  const confidence = typeof signal.confidence_score === "number" ? `${signal.confidence_score}% confidence` : "live Pulse context";
  const flock = signal.flock?.name ? ` in ${signal.flock.name}` : "";
  return `This Signal carries ${confidence}${flock} and is tied to ${Math.max(1, signal.amplifies_count + signal.comments_count)} network interaction${signal.amplifies_count + signal.comments_count === 1 ? "" : "s"}.`;
}

function truncateText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3).trim()}...` : value;
}

function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeRenderableSignal(signal: SignalWithAuthor): SignalWithAuthor {
  return {
    ...signal,
    id: typeof signal.id === "string" ? signal.id : "unknown-signal",
    title: typeof signal.title === "string" && signal.title.trim() ? signal.title : "Untitled Signal",
    body: typeof signal.body === "string" ? signal.body : "",
    created_at: Number.isFinite(new Date(signal.created_at).getTime()) ? signal.created_at : new Date().toISOString(),
    updated_at: Number.isFinite(new Date(signal.updated_at).getTime()) ? signal.updated_at : new Date().toISOString(),
    likes_count: typeof signal.likes_count === "number" ? signal.likes_count : 0,
    amplifies_count: typeof signal.amplifies_count === "number" ? signal.amplifies_count : 0,
    comments_count: typeof signal.comments_count === "number" ? signal.comments_count : 0,
    media: safeArray(signal.media).filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null),
    media_urls: safeArray(signal.media_urls).filter((item): item is string => typeof item === "string" && item.trim().length > 0),
    attachments: safeArray(signal.attachments).filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null),
    ai_narrative_tags: safeArray(signal.ai_narrative_tags).filter((item): item is string => typeof item === "string"),
    author: signal.author ? {
      ...signal.author,
      id: typeof signal.author.id === "string" ? signal.author.id : "unknown-author",
      username: typeof signal.author.username === "string" ? signal.author.username : "unknown",
      display_name: typeof signal.author.display_name === "string" ? signal.author.display_name : "Unknown Operator",
      avatar_url: typeof signal.author.avatar_url === "string" ? signal.author.avatar_url : null,
      operator_type: signal.author.operator_type ?? "human",
      expertise_domains: safeArray(signal.author.expertise_domains).filter((item): item is string => typeof item === "string"),
    } : null,
  };
}

function getEscalationLevel({
  pulse,
  contradiction,
  velocity,
}: {
  pulse: number;
  contradiction: number;
  velocity: number;
}) {
  if (pulse >= 78 || contradiction >= 45 || velocity >= 4) return "critical";
  if (pulse >= 45 || contradiction >= 28 || velocity >= 1.5) return "rising";
  return "watch";
}
