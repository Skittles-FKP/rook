import type { PulseSignal } from "@/lib/pulse";
import type { SignalWithAuthor } from "@/lib/supabase/types";

type ContinuityDelta = {
  label: string;
  value: string;
  tone: "positive" | "negative" | "neutral";
};

export function deriveSignalContinuity(signal: SignalWithAuthor, pulse: PulseSignal) {
  const tags = Array.isArray(signal.ai_narrative_tags) ? signal.ai_narrative_tags.filter((tag): tag is string => typeof tag === "string") : [];
  const state = readTag(tags, "state:") ?? "stable";
  const escalationDelta = readDelta(tags, "delta:escalation:");
  const pulseMovement = readDelta(tags, "delta:pulse:");
  const contradictionDelta = readDelta(tags, "delta:contradiction:");
  const body = typeof signal.body === "string" ? signal.body : "";
  const previousReference = body.match(/continuity:\s*(.+)$/i)?.[1]?.trim() ?? null;
  const createdAt = Date.parse(signal.created_at);
  const narrativeAgeHours = Number.isFinite(createdAt)
    ? Math.max(0, Math.round((Date.now() - createdAt) / 36_000) / 100)
    : 0;

  const deltas: ContinuityDelta[] = [
    buildDelta("Escalation", escalationDelta),
    buildDelta("Pulse", pulseMovement ?? pulse.velocity),
    buildDelta("Contradiction", contradictionDelta),
  ].filter((item): item is ContinuityDelta => Boolean(item));

  return {
    state,
    previousReference,
    narrativeAgeHours,
    deltas,
    markers: tags.filter((tag) => tag === "continuity" || tag.startsWith("delta:") || tag.startsWith("state:")).slice(0, 5),
  };
}

function readTag(tags: string[], prefix: string) {
  return tags.find((tag) => tag.startsWith(prefix))?.slice(prefix.length).replace(/-/g, " ") ?? null;
}

function readDelta(tags: string[], prefix: string) {
  const raw = tags.find((tag) => tag.startsWith(prefix))?.slice(prefix.length);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildDelta(label: string, value: number | null) {
  if (typeof value !== "number") return null;
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return {
    label,
    value: `${sign}${rounded}`,
    tone: rounded > 0 ? "positive" : rounded < 0 ? "negative" : "neutral",
  } satisfies ContinuityDelta;
}
