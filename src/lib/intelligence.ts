import { getBriefs } from "@/lib/data/briefs";
import { getFlocks } from "@/lib/data/flocks";
import { getPulseSnapshot } from "@/lib/data/pulse";
import { extractTopicTerms, scorePulseSignal, type PulseSignal } from "@/lib/pulse";
import type { BriefWithCandidate } from "@/lib/data/briefs";
import type { FlockSummary } from "@/lib/data/flocks";
import type { SignalWithAuthor } from "@/lib/supabase/types";

export type GraphNodeKind = "signal" | "operator" | "flock" | "topic" | "brief" | "cluster";

export type GraphNode = {
  id: string;
  label: string;
  kind: GraphNodeKind;
  weight: number;
  pulse: number;
  meta: string;
  avatarUrl?: string | null;
  operatorType?: "human" | "ai_agent" | "autonomous" | "organization" | null;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  kind: "authored" | "belongs_to" | "topic" | "summarizes" | "converges" | "alignment" | "contradicts";
  strength: number;
};

export type IntelligenceGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  radar: RadarPoint[];
  narratives: NarrativeInsight[];
  collaborationRooms: CollaborationRoom[];
  updatedAt: string;
};

export type RadarPoint = {
  id: string;
  label: string;
  angle: number;
  radius: number;
  score: number;
  anomaly: number;
  acceleration: number;
};

export type NarrativeInsight = {
  id: string;
  title: string;
  summary: string;
  consensus_shift: number;
  contradiction_risk: number;
  operator_alignment: number;
};

export type CollaborationRoom = {
  id: string;
  name: string;
  detail: string;
  operators: number;
  signal_count: number;
  pulse_score: number;
};

export type SignalIntelligence = {
  confidence: number;
  narrative_tags: string[];
  contradiction_score: number;
  sentiment: "Constructive" | "Divergent" | "Neutral" | "Volatile";
  velocity_history: number[];
};

export function getSignalIntelligence(signal: SignalWithAuthor | PulseSignal): SignalIntelligence {
  const pulse = "pulse_score" in signal ? signal : scorePulseSignal(signal);
  const terms = pulse.topic_terms.length > 0 ? pulse.topic_terms : extractTopicTerms(pulse);
  const confidence = Math.min(
    98,
    Math.round(52 + pulse.amplifies_count * 7 + pulse.comments_count * 3 + (pulse.flock ? 8 : 0)),
  );
  const contradictionScore = Math.min(
    100,
    Math.round(pulse.comment_velocity * 18 + (pulse.anomaly_score > 4 ? 18 : 0)),
  );
  const sentiment =
    pulse.anomaly_score > 8
      ? "Volatile"
      : contradictionScore > 35
        ? "Divergent"
        : pulse.amplification_velocity > pulse.comment_velocity
          ? "Constructive"
          : "Neutral";

  return {
    confidence,
    narrative_tags: terms.slice(0, 4),
    contradiction_score: contradictionScore,
    sentiment,
    velocity_history: [
      Math.max(0, Number((pulse.velocity * 0.38).toFixed(2))),
      Math.max(0, Number((pulse.velocity * 0.54).toFixed(2))),
      Math.max(0, Number((pulse.velocity * 0.78).toFixed(2))),
      pulse.velocity,
    ],
  };
}

export async function getIntelligenceGraph(): Promise<IntelligenceGraph> {
  const [snapshot, briefs, flocks] = await Promise.all([
    getPulseSnapshot(48),
    getBriefs(),
    getFlocks(),
  ]);

  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, GraphEdge>();

  const addNode = (node: GraphNode) => {
    const existing = nodes.get(node.id);
    nodes.set(node.id, existing ? { ...existing, weight: Math.max(existing.weight, node.weight), pulse: Math.max(existing.pulse, node.pulse) } : node);
  };
  const addEdge = (edge: GraphEdge) => edges.set(edge.id, edge);

  for (const signal of snapshot.signals.slice(0, 32)) {
    addNode({
      id: `signal:${signal.id}`,
      label: signal.title,
      kind: "signal",
      weight: 10 + signal.velocity * 4,
      pulse: signal.pulse_score,
      meta: `${signal.pulse_labels[0] ?? "Signal"} · v${signal.velocity}/h`,
    });

    if (signal.author) {
      addNode({
        id: `operator:${signal.author.id}`,
        label: signal.author.display_name,
        kind: "operator",
        weight: 16 + signal.amplifies_count * 2,
        pulse: signal.pulse_score,
        meta: `@${signal.author.username}`,
        avatarUrl: signal.author.avatar_url,
        operatorType: signal.author.operator_type,
      });
      addEdge({
        id: `authored:${signal.author.id}:${signal.id}`,
        source: `operator:${signal.author.id}`,
        target: `signal:${signal.id}`,
        kind: "authored",
        strength: 1 + signal.velocity,
      });
    }

    if (signal.flock) {
      addNode({
        id: `flock:${signal.flock.id}`,
        label: signal.flock.name,
        kind: "flock",
        weight: 18,
        pulse: signal.pulse_score,
        meta: "Flock",
      });
      addEdge({
        id: `flock:${signal.flock.id}:${signal.id}`,
        source: `flock:${signal.flock.id}`,
        target: `signal:${signal.id}`,
        kind: "belongs_to",
        strength: 1.5,
      });
    }

    for (const term of signal.topic_terms.slice(0, 3)) {
      addNode({
        id: `topic:${term}`,
        label: term,
        kind: "topic",
        weight: 14,
        pulse: signal.pulse_score,
        meta: "Narrative term",
      });
      addEdge({
        id: `topic:${term}:${signal.id}`,
        source: `topic:${term}`,
        target: `signal:${signal.id}`,
        kind: "topic",
        strength: 1 + signal.velocity / 2,
      });
    }
  }

  for (const cluster of snapshot.clusters.slice(0, 8)) {
    addNode({
      id: `cluster:${cluster.id}`,
      label: cluster.title,
      kind: "cluster",
      weight: 22 + cluster.signals.length * 2,
      pulse: cluster.pulse_score,
      meta: `${cluster.signals.length} Signals converging`,
    });
    for (const signal of cluster.signals.slice(0, 8)) {
      addEdge({
        id: `cluster:${cluster.id}:${signal.id}`,
        source: `cluster:${cluster.id}`,
        target: `signal:${signal.id}`,
        kind: "converges",
        strength: 2 + cluster.pulse_score / 80,
      });
    }
    for (const contradiction of buildContradictionEdges(cluster.signals).slice(0, 4)) {
      addEdge({
        id: `contradicts:${contradiction.id}`,
        source: `signal:${contradiction.signal_a_id}`,
        target: `signal:${contradiction.signal_b_id}`,
        kind: "contradicts",
        strength: 1.4 + contradiction.score / 40,
      });
    }
  }

  for (const brief of briefs.slice(0, 10)) {
    addBriefToGraph(brief, addNode, addEdge);
  }

  return {
    nodes: [...nodes.values()].slice(0, 90),
    edges: [...edges.values()].slice(0, 160),
    radar: snapshot.clusters.slice(0, 10).map((cluster, index) => ({
      id: cluster.id,
      label: cluster.title,
      angle: (index / Math.max(snapshot.clusters.length, 1)) * 360,
      radius: Math.max(18, 92 - Math.min(cluster.pulse_score, 90)),
      score: cluster.pulse_score,
      anomaly: cluster.anomaly_score,
      acceleration: cluster.signals.reduce((total, signal) => total + signal.acceleration, 0),
    })),
    narratives: snapshot.clusters.slice(0, 6).map((cluster) => ({
      id: cluster.id,
      title: cluster.title,
      summary: cluster.narrative,
      consensus_shift: Math.min(100, Math.round(cluster.pulse_score / 1.4)),
      contradiction_risk: Math.min(100, Math.round(cluster.anomaly_score * 10)),
      operator_alignment: Math.min(100, Math.round(44 + cluster.flock_count * 12 + cluster.signals.length * 5)),
    })),
    collaborationRooms: buildRooms(flocks, snapshot.signals),
    updatedAt: new Date().toISOString(),
  };
}

function buildContradictionEdges(signals: PulseSignal[]) {
  return signals.flatMap((signal, index) => {
    const next = signals[index + 1];
    if (!next) return [];
    const score = Math.min(
      100,
      Math.round(
        (signal.anomaly_score + next.anomaly_score) * 7 +
          Math.abs(signal.comment_velocity - next.comment_velocity) * 9,
      ),
    );

    if (score < 28) return [];

    return [{
      id: `${signal.id}-${next.id}`,
      signal_a_id: signal.id,
      signal_b_id: next.id,
      score,
    }];
  });
}

function addBriefToGraph(
  brief: BriefWithCandidate,
  addNode: (node: GraphNode) => void,
  addEdge: (edge: GraphEdge) => void,
) {
  addNode({
    id: `brief:${brief.id}`,
    label: brief.title,
    kind: "brief",
    weight: brief.status === "ready" ? 20 : 14,
    pulse: brief.candidate?.pulse_score ?? 0,
    meta: brief.status === "ready" ? "AI Brief ready" : "Brief pending",
  });

  for (const signalId of brief.source_signal_ids.slice(0, 6)) {
    addEdge({
      id: `brief:${brief.id}:${signalId}`,
      source: `brief:${brief.id}`,
      target: `signal:${signalId}`,
      kind: "summarizes",
      strength: brief.status === "ready" ? 2 : 1,
    });
  }
}

function buildRooms(flocks: FlockSummary[], signals: PulseSignal[]): CollaborationRoom[] {
  return flocks.slice(0, 8).map((flock) => {
    const roomSignals = signals.filter((signal) => signal.flock?.id === flock.id);

    return {
      id: flock.id,
      name: flock.name,
      detail: flock.description ?? "Shared intelligence room",
      operators: flock.members_count,
      signal_count: roomSignals.length,
      pulse_score: roomSignals.reduce((total, signal) => total + signal.pulse_score, 0),
    };
  });
}
