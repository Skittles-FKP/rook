import { scorePulseSignal } from "@/lib/pulse";
import { feedRankingAgent } from "@/lib/agents/news/feedRankingAgent";
import { getSignalMedia } from "@/lib/media";
import type { SignalWithAuthor } from "@/lib/supabase/types";

export type SignalSize = "XS" | "SM" | "MD" | "LG" | "FEATURED";

export type SignalType =
  | "alert"
  | "chart"
  | "graph"
  | "narrative"
  | "intelligence brief"
  | "media";

export type RankedSignal = {
  signal: SignalWithAuthor;
  rank: number;
  score: number;
  size: SignalSize;
  type: SignalType;
  imageFirst: boolean;
  rhythm: "visual" | "brief" | "dense" | "scan" | "pulse";
};

export function rankFeedSignals(signals: SignalWithAuthor[]): RankedSignal[] {
  const agentRanked = feedRankingAgent.rank(signals);
  const ranked = agentRanked
    .map((signal) => {
      const pulse = scorePulseSignal(signal);
      const ageHours = hoursSince(signal.created_at);
      const mediaWeight = hasVisualMedia(signal) ? 18 : 0;
      const briefWeight = hasBriefShape(signal) ? 13 : 0;
      const alertWeight = getSignalType(signal) === "alert" ? 20 : 0;
      const confidenceWeight = typeof signal.confidence_score === "number" ? signal.confidence_score / 4 : 0;
      const recencyWeight = Math.max(0, 18 - ageHours * 1.6);
      const score =
        pulse.pulse_score +
        mediaWeight +
        briefWeight +
        alertWeight +
        confidenceWeight +
        recencyWeight;

      return { signal, score, type: getSignalType(signal) };
    })
    .sort((a, b) => b.score - a.score);

  return ranked.map((item, index) => {
    const rhythm = getRhythm(index, item.signal, item.type);
    return {
      ...item,
      rank: index + 1,
      size: getSignalSize(index, item.score, item.signal, item.type, rhythm),
      imageFirst: rhythm === "visual" || item.type === "media" || item.type === "chart",
      rhythm,
    };
  });
}

export function getSignalType(signal: SignalWithAuthor): SignalType {
  const text = `${signal.title ?? ""} ${signal.body ?? ""} ${(signal.ai_narrative_tags ?? []).join(" ")}`.toLowerCase();
  const mediaType = signal.media_type;

  if ((signal.contradiction_score ?? 0) >= 45 || /\b(alert|breaking|critical|outage|incident|risk)\b/.test(text)) {
    return "alert";
  }

  if (mediaType === "chart" || Boolean(signal.chart_url) || /\b(chart|index|metric|revenue|market|capacity)\b/.test(text)) {
    return "chart";
  }

  if (/\b(graph|network|cluster|node|edge|relationship|topology)\b/.test(text)) {
    return "graph";
  }

  if (/\b(brief|summary|memo|decision|takeaway)\b/.test(text)) {
    return "intelligence brief";
  }

  if ((signal.ai_narrative_tags?.length ?? 0) > 0 || /\b(narrative|consensus|divergence|drift|storyline)\b/.test(text)) {
    return "narrative";
  }

  return "media";
}

function getSignalSize(
  index: number,
  score: number,
  signal: SignalWithAuthor,
  type: SignalType,
  rhythm: RankedSignal["rhythm"],
): SignalSize {
  if (index === 0 || score >= 92) return "FEATURED";
  if (index < 3 || score >= 72 || type === "alert") return "LG";
  if (rhythm === "brief" || score >= 48) return "MD";
  if (rhythm === "scan" || signal.body.length < 180) return "XS";
  return "SM";
}

function getRhythm(index: number, signal: SignalWithAuthor, type: SignalType): RankedSignal["rhythm"] {
  if (index === 0 || hasVisualMedia(signal) || type === "chart") return "visual";
  if (type === "intelligence brief" || index % 7 === 2) return "brief";
  if (type === "alert" || index % 6 === 3) return "pulse";
  if (index % 4 === 1) return "dense";
  return "scan";
}

function hasVisualMedia(signal: SignalWithAuthor) {
  return getSignalMedia(signal).some((media) => media.type === "image" || media.type === "video" || media.type === "chart" || media.type === "ai_generated");
}

function hasBriefShape(signal: SignalWithAuthor) {
  const text = `${signal.title ?? ""} ${signal.body ?? ""}`.toLowerCase();
  return /\b(what changed|why it matters|brief|takeaway|decision)\b/.test(text);
}

function hoursSince(value: string) {
  const age = Date.now() - new Date(value).getTime();
  return Number.isFinite(age) ? Math.max(age / 36e5, 0.25) : 24;
}
