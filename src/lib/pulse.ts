import type { SignalWithAuthor } from "@/lib/supabase/types";

export type PulseLabel =
  | "Velocity Rising"
  | "Pulse Candidate"
  | "High Momentum"
  | "Emerging Cluster";

export type PulseSignal = SignalWithAuthor & {
  pulse_score: number;
  velocity: number;
  acceleration: number;
  amplification_velocity: number;
  comment_velocity: number;
  recent_growth_weight: number;
  anomaly_score: number;
  pulse_labels: PulseLabel[];
  topic_terms: string[];
};

export type PulseCluster = {
  id: string;
  title: string;
  terms: string[];
  signals: PulseSignal[];
  pulse_score: number;
  anomaly_score: number;
  flock_count: number;
  narrative: string;
};

const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "against",
  "from",
  "have",
  "into",
  "over",
  "that",
  "this",
  "with",
  "will",
  "your",
  "signal",
  "signals",
  "rook",
]);

function hoursSince(value: string) {
  const age = Date.now() - new Date(value).getTime();
  return Math.max(age / 36e5, 0.25);
}

export function extractTopicTerms(signal: Pick<SignalWithAuthor, "title" | "body" | "flock">) {
  const text = `${signal.title} ${signal.body} ${signal.flock?.name ?? ""}`.toLowerCase();
  const terms = text
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((term) => term.length > 3 && !STOP_WORDS.has(term));

  const counts = new Map<string, number>();
  for (const term of terms) {
    counts.set(term, (counts.get(term) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([term]) => term);
}

export function scorePulseSignal(signal: SignalWithAuthor): PulseSignal {
  const ageHours = hoursSince(signal.created_at);
  const engagement = signal.likes_count + signal.comments_count + signal.amplifies_count;
  const amplificationVelocity = signal.amplifies_count / ageHours;
  const commentVelocity = signal.comments_count / ageHours;
  const engagementVelocity = engagement / ageHours;
  const recentGrowthWeight = Math.min(2.4, 1 + 8 / (ageHours + 8));
  const acceleration =
    (signal.likes_count * 1.2 + signal.comments_count * 2.4 + signal.amplifies_count * 3.1) *
    recentGrowthWeight;
  const anomalyScore =
    signal.comments_count > 0 && signal.likes_count <= 1
      ? signal.comments_count * 1.8
      : amplificationVelocity > commentVelocity * 2
        ? amplificationVelocity * 1.4
        : Math.max(0, engagementVelocity - 2);
  const pulseScore = Math.round(
    acceleration + engagementVelocity * 8 + anomalyScore * 3 + (signal.flock ? 8 : 0),
  );

  const labels: PulseLabel[] = [];
  if (engagementVelocity >= 1.4 || acceleration >= 16) labels.push("Velocity Rising");
  if (pulseScore >= 36) labels.push("Pulse Candidate");
  if (pulseScore >= 64 || amplificationVelocity >= 1.2) labels.push("High Momentum");
  if (extractTopicTerms(signal).length >= 3 && engagement >= 2) labels.push("Emerging Cluster");

  return {
    ...signal,
    pulse_score: pulseScore,
    velocity: Number(engagementVelocity.toFixed(2)),
    acceleration: Number(acceleration.toFixed(2)),
    amplification_velocity: Number(amplificationVelocity.toFixed(2)),
    comment_velocity: Number(commentVelocity.toFixed(2)),
    recent_growth_weight: Number(recentGrowthWeight.toFixed(2)),
    anomaly_score: Number(anomalyScore.toFixed(2)),
    pulse_labels: labels,
    topic_terms: extractTopicTerms(signal),
  };
}

export function clusterPulseSignals(signals: PulseSignal[]): PulseCluster[] {
  const clusters = new Map<string, PulseSignal[]>();

  for (const signal of signals) {
    const key = signal.topic_terms[0] ?? signal.flock?.slug ?? signal.id;
    clusters.set(key, [...(clusters.get(key) ?? []), signal]);
  }

  return [...clusters.entries()]
    .map(([key, items]) => {
      const terms = [...new Set(items.flatMap((item) => item.topic_terms))].slice(0, 5);
      const flocks = new Set(items.map((item) => item.flock?.id).filter(Boolean));
      const score = items.reduce((total, item) => total + item.pulse_score, 0);
      const anomaly = Math.max(...items.map((item) => item.anomaly_score), 0);

      return {
        id: key,
        title: terms.length > 0 ? terms.map((term) => term[0].toUpperCase() + term.slice(1)).join(" / ") : "Unclustered signal",
        terms,
        signals: items,
        pulse_score: score,
        anomaly_score: Number(anomaly.toFixed(2)),
        flock_count: flocks.size,
        narrative:
          items.length > 1
            ? `${items.length} related Signals converging across ${Math.max(flocks.size, 1)} Flock surface.`
            : "Single Signal showing early movement.",
      };
    })
    .sort((a, b) => b.pulse_score - a.pulse_score);
}
