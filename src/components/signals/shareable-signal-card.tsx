"use client";

import { RadioTower } from "lucide-react";
import { RookBirdIcon } from "@/components/brand";
import { MediaBoundary } from "@/components/signals/signal-error-boundary";
import { SignalMedia } from "@/components/signals/signal-media";
import { getSignalIntelligence } from "@/lib/signal-intelligence";
import { scorePulseSignal } from "@/lib/pulse";
import type { SignalWithAuthor } from "@/lib/supabase/types";

export function ShareableSignalCard({ signal }: { signal: SignalWithAuthor }) {
  const safeSignal = normalizeShareSignal(signal);
  const pulse = scorePulseSignal(safeSignal);
  const intelligence = getSignalIntelligence(pulse);
  const tags = Array.isArray(intelligence.narrative_tags) ? intelligence.narrative_tags : [];

  return (
    <div className="accent-border w-full max-w-full min-w-0 overflow-hidden rounded-xl bg-rook-graphite p-3 sm:p-5">
      <div className="flex min-w-0 max-w-full flex-wrap items-start justify-between gap-3 sm:gap-5">
        <div className="flex min-w-0 items-center gap-3">
          <RookBirdIcon className="h-10 w-10 flex-shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-white">Rook Signal Card</p>
            <p className="mt-1 truncate text-xs font-semibold text-rook-muted">
              @{safeSignal.author?.username ?? "unknown"} · {safeSignal.flock?.name ?? "Open Network"}
            </p>
          </div>
        </div>
        <span className="inline-flex max-w-full flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-rook-green/25 bg-rook-green/10 px-2.5 py-1 text-xs font-black text-rook-green">
          <RadioTower className="h-3.5 w-3.5 flex-shrink-0" />
          Pulse {pulse.pulse_score}
        </span>
      </div>
      <h3 className="mobile-readable mt-5 max-w-full text-xl font-black leading-tight text-white [overflow-wrap:anywhere] sm:mt-6 sm:text-2xl">{safeSignal.title}</h3>
      <p className="mobile-readable mt-3 line-clamp-4 max-w-full text-sm leading-6 text-rook-muted [overflow-wrap:anywhere]">{safeSignal.body}</p>
      <MediaBoundary>
        <SignalMedia signal={safeSignal} />
      </MediaBoundary>
      <div className="mt-5 grid min-w-0 max-w-full gap-2 sm:mt-6 sm:grid-cols-3">
        <Metric label="Confidence" value={`${intelligence.confidence}%`} />
        <Metric label="Velocity" value={`${pulse.velocity}/h`} />
        <Metric label="Sentiment" value={intelligence.sentiment} />
      </div>
      <div className="mt-5 flex min-w-0 max-w-full flex-wrap gap-2 overflow-hidden">
        {tags.map((tag) => (
          <span key={tag} className="max-w-full truncate rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-rook-muted">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function normalizeShareSignal(signal: SignalWithAuthor): SignalWithAuthor {
  return {
    ...signal,
    title: typeof signal.title === "string" && signal.title.trim() ? signal.title : "Untitled Signal",
    body: typeof signal.body === "string" ? signal.body : "",
    created_at: Number.isFinite(new Date(signal.created_at).getTime()) ? signal.created_at : new Date().toISOString(),
    updated_at: Number.isFinite(new Date(signal.updated_at).getTime()) ? signal.updated_at : new Date().toISOString(),
    likes_count: typeof signal.likes_count === "number" ? signal.likes_count : 0,
    amplifies_count: typeof signal.amplifies_count === "number" ? signal.amplifies_count : 0,
    comments_count: typeof signal.comments_count === "number" ? signal.comments_count : 0,
    ai_narrative_tags: Array.isArray(signal.ai_narrative_tags) ? signal.ai_narrative_tags.filter((item): item is string => typeof item === "string") : [],
    media_urls: Array.isArray(signal.media_urls) ? signal.media_urls.filter((item): item is string => typeof item === "string") : [],
    attachments: Array.isArray(signal.attachments) ? signal.attachments.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null) : [],
    author: signal.author ? {
      ...signal.author,
      username: typeof signal.author.username === "string" ? signal.author.username : "unknown",
      display_name: typeof signal.author.display_name === "string" ? signal.author.display_name : "Unknown Operator",
      expertise_domains: Array.isArray(signal.author.expertise_domains) ? signal.author.expertise_domains : [],
    } : null,
  };
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] p-3">
      <p className="truncate text-sm font-black text-white">{value}</p>
      <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-[0.12em] text-rook-muted">{label}</p>
    </div>
  );
}
