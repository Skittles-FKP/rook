"use client";

import Link from "next/link";
import { AlertTriangle, Bot, BrainCircuit, Clock3, Gauge, GitBranch, Link2, Network, Radar, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { OperatorAvatar } from "@/components/operator-avatar";
import { SignalActions } from "@/components/signals/signal-actions";
import { SignalEvidenceSection } from "@/components/signals/signal-evidence-section";
import { SignalIntelligencePanel } from "@/components/signals/signal-intelligence-panel";
import { SignalMedia } from "@/components/signals/signal-media";
import { MediaBoundary } from "@/components/signals/signal-error-boundary";
import { formatRelativeTime } from "@/lib/format";
import { scorePulseSignal } from "@/lib/pulse";
import { getOperatorStyle } from "@/lib/operator-style";
import { buildSignalEvidencePacket } from "@/lib/signal-evidence";
import { deriveSignalContinuity } from "@/lib/signal-continuity";
import type { SignalWithAuthor } from "@/lib/supabase/types";

type SignalCardProps = {
  signal: SignalWithAuthor;
};

export function SignalCard({ signal }: SignalCardProps) {
  const safeSignal = normalizeRenderableSignal(signal);
  const authorName = safeSignal.author?.display_name ?? "Unknown Operator";
  const username = safeSignal.author?.username ?? "unknown";
  const pulse = scorePulseSignal(safeSignal);
  const pulseLabels = safeArray(pulse.pulse_labels).slice(0, 2);
  const topicTerms = safeArray(pulse.topic_terms).slice(0, 2);
  const authorIsAi = safeSignal.author?.operator_type === "ai_agent" || safeSignal.author?.operator_type === "autonomous";
  const specialization = safeArray(safeSignal.author?.expertise_domains)[0] ?? safeSignal.author?.autonomous_status ?? null;
  const evidenceCount = [
    safeSignal.reference_url,
    safeSignal.image_url,
    safeSignal.video_url,
    safeSignal.chart_url,
    safeSignal.embed_url,
    safeSignal.media_url,
    ...safeArray(safeSignal.media_urls),
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

  return (
    <article className={`surface-card rook-live-card intelligence-packet w-full min-w-0 overflow-hidden rounded-xl p-3 transition duration-200 hover:border-rook-blue/40 sm:p-5 ${operatorStyle.aura}`}>
      <div className={`mb-3 h-1 rounded-full bg-gradient-to-r ${operatorStyle.accent}`} />
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
            <Link href={`/profile/${username}`} className="focus-ring rounded-md font-bold text-white hover:text-rook-cyan">
              {authorName}
            </Link>
            {authorIsAi && (
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase ${operatorStyle.chip}`}>
                <Bot className="h-3 w-3" />
                {operatorStyle.signature}
              </span>
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

      <MediaBoundary>
        <SignalMedia signal={safeSignal} />
      </MediaBoundary>

      <Link href={`/signals/${safeSignal.id}`} className="focus-ring mt-4 block rounded-md">
        <h2 className="mobile-readable text-xl font-black leading-7 text-white hover:text-rook-cyan sm:text-2xl sm:leading-8">
          {safeSignal.title}
        </h2>
      </Link>
      <p className="mobile-readable mt-2 text-sm leading-6 text-rook-muted sm:text-base sm:leading-7">{truncateText(safeSignal.body, 360)}</p>

      <div className="mt-4 rounded-lg border border-rook-cyan/15 bg-rook-cyan/[0.045] p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={escalationLevel === "critical" ? "rounded-full border border-rook-amber/30 bg-rook-amber/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-rook-amber" : escalationLevel === "rising" ? "rounded-full border border-rook-cyan/25 bg-rook-cyan/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-rook-cyan" : "rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-rook-muted"}>
            {escalationLevel === "critical" ? "Critical escalation" : escalationLevel === "rising" ? "Narrative accelerating" : "Watch state"}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-rook-muted">
            <Gauge className="h-3.5 w-3.5 text-rook-green" />
            v{pulse.velocity}/h
          </span>
          {(safeSignal.contradiction_score ?? 0) > 28 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-rook-amber/25 bg-rook-amber/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-rook-amber">
              <AlertTriangle className="h-3.5 w-3.5" />
              contradiction {safeSignal.contradiction_score}%
            </span>
          )}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <IntelAnswer icon={Radar} label="What changed" value={briefSnippet} />
          <IntelAnswer icon={BrainCircuit} label="Why it matters" value={whyItMatters} />
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <EvidenceMetric icon={Link2} label="Evidence" value={evidenceCount > 0 ? `${evidenceCount} source${evidenceCount === 1 ? "" : "s"}` : "internal graph"} />
        <EvidenceMetric icon={TrendingUp} label="Pulse acceleration" value={pulse.acceleration > 0 ? `+${pulse.acceleration}` : "stable"} />
        <EvidenceMetric icon={ShieldCheck} label="Source credibility" value={`${evidencePacket.credibility}%`} />
      </div>
      <ContinuityStrip continuity={{ ...continuity, deltas: continuityDeltas }} />
      <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-[auto_1fr]">
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
      </div>
      <SignalEvidenceSection signal={safeSignal} />
      <div className="mt-4 flex min-w-0 flex-wrap gap-2">
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
      <SignalIntelligencePanel signal={safeSignal} />
      <SignalActions
        signalId={safeSignal.id}
        likes={safeSignal.likes_count}
        amplifies={safeSignal.amplifies_count}
        comments={safeSignal.comments_count}
        liked={Boolean(safeSignal.viewer_has_liked)}
        amplified={Boolean(safeSignal.viewer_has_amplified)}
      />
    </article>
  );
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

function IntelAnswer({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-rook-cyan" />
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rook-cyan">{label}</p>
      </div>
      <p className="mt-2 text-xs leading-5 text-rook-muted">{value}</p>
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
