import { getBriefs, type BriefCandidate } from "@/lib/data/briefs";
import { getPulseSnapshot } from "@/lib/data/pulse";
import { getSignalIntelligence } from "@/lib/intelligence";
import type { BriefWithCandidate } from "@/lib/data/briefs";
import type { PulseCluster, PulseSignal } from "@/lib/pulse";

export type NarrativePhase = "Emergence" | "Acceleration" | "Fragmentation" | "Convergence" | "Decay";

export type NarrativeTimelinePoint = {
  id: string;
  phase: NarrativePhase;
  timestamp: string;
  label: string;
  detail: string;
  pulse_score: number;
  acceleration: number;
  linked_signal_ids: string[];
};

export type NarrativeDriftPoint = {
  label: string;
  confidence: number;
  alignment: number;
  disagreement: number;
};

export type ContradictionPair = {
  id: string;
  signal_a_id: string;
  signal_b_id: string;
  signal_a_title: string;
  signal_b_title: string;
  score: number;
  rationale: string;
};

export type ReplaySnapshot = {
  id: string;
  timestamp: string;
  label: string;
  pulse: number;
  operators: number;
  signals: number;
  graph_state: "forming" | "spreading" | "fragmenting" | "converging" | "cooling";
};

export type PredictivePulse = {
  acceleration_probability: number;
  pulse_formation_probability: number;
  operator_convergence_probability: number;
  fragmentation_probability: number;
};

export type NarrativeRecord = {
  id: string;
  title: string;
  summary: string;
  confidence_score: number;
  volatility_score: number;
  fragmentation_score: number;
  acceleration_score: number;
  operator_density_score: number;
  decay_score: number;
  cluster: PulseCluster;
  timeline: NarrativeTimelinePoint[];
  drift: NarrativeDriftPoint[];
  contradictions: ContradictionPair[];
  replay: ReplaySnapshot[];
  predictions: PredictivePulse;
  linked_briefs: BriefWithCandidate[];
  operator_contributions: Array<{
    operator: string;
    username: string;
    signals: number;
    alignment: number;
  }>;
};

export async function getNarrativeSystem(): Promise<NarrativeRecord[]> {
  const snapshotResult = await Promise.resolve(getPulseSnapshot(64)).then(
    (value) => ({ status: "fulfilled" as const, value }),
    (reason) => ({ status: "rejected" as const, reason }),
  );
  const snapshot = snapshotResult.status === "fulfilled"
    ? snapshotResult.value
    : { signals: [], clusters: [], events: [], updatedAt: new Date().toISOString() };
  const candidates: BriefCandidate[] = snapshot.clusters.slice(0, 8).map((cluster) => ({
    cluster_key: cluster.id,
    title: cluster.title,
    pulse_score: cluster.pulse_score,
    signal_count: cluster.signals.length,
    source_signal_ids: cluster.signals.map((signal) => signal.id),
  }));
  const briefsResult = await Promise.resolve(getBriefs(candidates)).then(
    (value) => ({ status: "fulfilled" as const, value }),
    (reason) => ({ status: "rejected" as const, reason }),
  );
  const briefs = briefsResult.status === "fulfilled" ? briefsResult.value : [];

  if (snapshotResult.status === "rejected") {
    console.error("[narratives] getPulseSnapshot failed after defensive fallback", snapshotResult.reason);
  }

  if (briefsResult.status === "rejected") {
    console.error("[narratives] getBriefs failed after defensive fallback", briefsResult.reason);
  }

  return snapshot.clusters.slice(0, 12).map((cluster) => buildNarrativeRecord(cluster, briefs));
}

export async function getNarrativeById(id: string) {
  const narratives = await getNarrativeSystem();
  return narratives.find((narrative) => narrative.id === id) ?? null;
}

export function buildNarrativeRecord(cluster: PulseCluster, briefs: BriefWithCandidate[]): NarrativeRecord {
  const signals = cluster.signals;
  const acceleration = Math.round(signals.reduce((total, signal) => total + signal.acceleration, 0));
  const comments = signals.reduce((total, signal) => total + signal.comments_count, 0);
  const amplifies = signals.reduce((total, signal) => total + signal.amplifies_count, 0);
  const operators = new Map<string, { operator: string; username: string; signals: number; alignment: number }>();

  for (const signal of signals) {
    if (!signal.author) continue;
    const current = operators.get(signal.author.id) ?? {
      operator: signal.author.display_name,
      username: signal.author.username,
      signals: 0,
      alignment: 0,
    };
    current.signals += 1;
    current.alignment = Math.max(current.alignment, getSignalIntelligence(signal).confidence);
    operators.set(signal.author.id, current);
  }

  const volatility = Math.min(100, Math.round(cluster.anomaly_score * 11 + comments * 1.4));
  const fragmentation = Math.min(100, Math.round(comments * 2.2 + cluster.flock_count * 9));
  const density = Math.min(100, Math.round(operators.size * 18 + signals.length * 6));
  const confidence = Math.min(98, Math.round(48 + amplifies * 2 + density * 0.28 - volatility * 0.12));
  const decay = Math.max(0, Math.round(100 - cluster.pulse_score / 2 - acceleration / 8));
  const linkedBriefs = briefs.filter((brief) =>
    brief.source_signal_ids.some((id) => signals.some((signal) => signal.id === id)) ||
    brief.cluster_key === cluster.id,
  );

  return {
    id: cluster.id,
    title: cluster.title,
    summary: cluster.narrative,
    confidence_score: confidence,
    volatility_score: volatility,
    fragmentation_score: fragmentation,
    acceleration_score: Math.min(100, Math.round(acceleration / 3)),
    operator_density_score: density,
    decay_score: decay,
    cluster,
    timeline: buildTimeline(cluster),
    drift: buildDrift(cluster),
    contradictions: buildContradictions(signals),
    replay: buildReplay(cluster),
    predictions: {
      acceleration_probability: Math.min(96, Math.round(cluster.pulse_score / 3 + acceleration / 6)),
      pulse_formation_probability: Math.min(98, Math.round(42 + cluster.signals.length * 9 + amplifies * 1.4)),
      operator_convergence_probability: Math.min(95, Math.round(density * 0.7 + cluster.flock_count * 10)),
      fragmentation_probability: fragmentation,
    },
    linked_briefs: linkedBriefs,
    operator_contributions: [...operators.values()].sort((a, b) => b.alignment - a.alignment),
  };
}

function buildTimeline(cluster: PulseCluster): NarrativeTimelinePoint[] {
  const ordered = [...cluster.signals].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  return ordered.map((signal, index) => {
    const phase: NarrativePhase =
      index === 0
        ? "Emergence"
        : signal.anomaly_score > 6
          ? "Fragmentation"
          : signal.acceleration > 45
            ? "Acceleration"
            : index === ordered.length - 1 && cluster.flock_count > 1
              ? "Convergence"
              : "Decay";

    return {
      id: `${cluster.id}-${signal.id}`,
      phase,
      timestamp: signal.created_at,
      label: signal.title,
      detail: `${signal.author?.display_name ?? "Unknown operator"} moved the narrative through ${signal.flock?.name ?? "the open network"}.`,
      pulse_score: signal.pulse_score,
      acceleration: signal.acceleration,
      linked_signal_ids: [signal.id],
    };
  });
}

function buildDrift(cluster: PulseCluster): NarrativeDriftPoint[] {
  const base = Math.min(96, Math.round(cluster.pulse_score / 3));
  return ["T-4", "T-3", "T-2", "T-1", "Now"].map((label, index) => ({
    label,
    confidence: Math.min(98, Math.round(base * (0.58 + index * 0.1))),
    alignment: Math.min(96, Math.round(38 + cluster.flock_count * 9 + index * 8)),
    disagreement: Math.min(90, Math.round(cluster.anomaly_score * 6 + (4 - index) * 5)),
  }));
}

function buildContradictions(signals: PulseSignal[]): ContradictionPair[] {
  const pairs: ContradictionPair[] = [];

  for (let index = 0; index < signals.length; index += 1) {
    const left = signals[index];
    const right = signals[index + 1];
    if (!left || !right) continue;
    const leftIntel = getSignalIntelligence(left);
    const rightIntel = getSignalIntelligence(right);
    const score = Math.min(
      100,
      Math.round((leftIntel.contradiction_score + rightIntel.contradiction_score) / 2 + Math.abs(left.comment_velocity - right.comment_velocity) * 8),
    );
    if (score < 28) continue;
    pairs.push({
      id: `${left.id}-${right.id}`,
      signal_a_id: left.id,
      signal_b_id: right.id,
      signal_a_title: left.title,
      signal_b_title: right.title,
      score,
      rationale: "Signals show divergent engagement patterns or conflicting operator confidence around the same narrative cluster.",
    });
  }

  return pairs;
}

function buildReplay(cluster: PulseCluster): ReplaySnapshot[] {
  const states: ReplaySnapshot["graph_state"][] = ["forming", "spreading", "fragmenting", "converging", "cooling"];
  return states.map((state, index) => ({
    id: `${cluster.id}-replay-${state}`,
    timestamp: new Date(Date.now() - (states.length - index) * 18 * 60 * 1000).toISOString(),
    label: state[0].toUpperCase() + state.slice(1),
    pulse: Math.max(5, Math.round(cluster.pulse_score * (0.28 + index * 0.18))),
    operators: Math.max(1, Math.round(cluster.signals.length + index * cluster.flock_count)),
    signals: Math.max(1, Math.round(cluster.signals.length * (0.45 + index * 0.18))),
    graph_state: state,
  }));
}
