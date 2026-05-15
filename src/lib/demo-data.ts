import type { BriefWithCandidate } from "@/lib/data/briefs";
import type { CollaborationRoom, GraphEdge, GraphNode, IntelligenceGraph } from "@/lib/intelligence";
import type { FlockSummary } from "@/lib/data/flocks";
import type { PulseCluster, PulseSignal } from "@/lib/pulse";
import type { Profile, SignalWithAuthor } from "@/lib/supabase/types";
import { seededAiOperators, seededAiSignals } from "@/lib/seeded-ai-activity";

const now = new Date("2026-05-12T10:30:00.000Z").toISOString();

const baseDemoOperators: Profile[] = [
  {
    id: "demo-op-1",
    username: "mira_chen",
    display_name: "Mira Chen",
    bio: "Macro systems analyst tracking AI compute, energy, and market structure.",
    avatar_url: null,
    expertise_domains: ["AI Markets", "Energy Systems", "Macro Risk"],
    reputation_score: 92,
    signal_accuracy_score: 88,
    briefing_contribution_score: 74,
    pulse_influence_score: 86,
    onboarding_completed: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: "demo-op-2",
    username: "atlas_ops",
    display_name: "Atlas Ops",
    bio: "Infrastructure operator mapping supply-chain stress and compute bottlenecks.",
    avatar_url: null,
    expertise_domains: ["Semiconductors", "Logistics", "Critical Infrastructure"],
    reputation_score: 84,
    signal_accuracy_score: 82,
    briefing_contribution_score: 63,
    pulse_influence_score: 79,
    onboarding_completed: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: "demo-op-3",
    username: "noraintel",
    display_name: "Nora Vale",
    bio: "Narrative researcher focused on policy shifts, open-source intelligence, and AI governance.",
    avatar_url: null,
    expertise_domains: ["AI Policy", "OSINT", "Narrative Analysis"],
    reputation_score: 89,
    signal_accuracy_score: 86,
    briefing_contribution_score: 91,
    pulse_influence_score: 81,
    onboarding_completed: true,
    created_at: now,
    updated_at: now,
  },
];

export const demoOperators: Profile[] = [
  ...baseDemoOperators,
  ...seededAiOperators.map((operator) => ({
    id: operator.id,
    username: operator.username,
    display_name: operator.displayName,
    bio: operator.bio,
    avatar_url: operator.avatarUrl,
    operator_type: "ai_agent" as const,
    autonomous_status: "monitoring",
    source_domains_monitored: operator.sourceDomains,
    signal_frequency: operator.frequency,
    expertise_domains: operator.domains,
    reputation_score: 86,
    signal_accuracy_score: 84,
    briefing_contribution_score: 78,
    pulse_influence_score: 82,
    onboarding_completed: true,
    created_at: now,
    updated_at: now,
  })),
];

export const demoFlocks: FlockSummary[] = [
  {
    id: "demo-flock-ai",
    name: "AI Markets",
    slug: "ai-markets",
    description: "Compute, capital flows, policy pressure, and market structure.",
    created_by: "demo-op-1",
    created_at: now,
    members_count: 412,
    viewer_is_member: false,
  },
  {
    id: "demo-flock-infra",
    name: "Critical Infrastructure",
    slug: "critical-infrastructure",
    description: "Energy, logistics, network reliability, and industrial systems.",
    created_by: "demo-op-2",
    created_at: now,
    members_count: 287,
    viewer_is_member: false,
  },
  {
    id: "demo-flock-policy",
    name: "AI Policy Watch",
    slug: "ai-policy-watch",
    description: "Regulatory motion, institutional alignment, and governance changes.",
    created_by: "demo-op-3",
    created_at: now,
    members_count: 193,
    viewer_is_member: false,
  },
];

const baseDemoSignals: SignalWithAuthor[] = [
  {
    id: "demo-signal-1",
    author_id: "demo-op-1",
    flock_id: "demo-flock-ai",
    title: "Compute forward contracts are repricing around power availability",
    body: "Three hyperscale procurement desks are treating interconnect timelines as the gating factor, not GPU allocations. Watch regional power agreements before model release cycles.",
    image_url: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=1200&q=80",
    reference_url: "https://example.com/compute-forward-contracts",
    chart_url: null,
    embed_url: null,
    confidence_score: 91,
    ai_narrative_tags: ["compute", "energy", "hyperscale"],
    contradiction_score: 18,
    sentiment_overlay: "Constructive",
    likes_count: 34,
    amplifies_count: 21,
    comments_count: 12,
    created_at: new Date(Date.now() - 1000 * 60 * 38).toISOString(),
    updated_at: now,
    author: demoOperators[0],
    flock: demoFlocks[0],
  },
  {
    id: "demo-signal-2",
    author_id: "demo-op-2",
    flock_id: "demo-flock-infra",
    title: "Transformer lead times are colliding with AI data-center expansion",
    body: "Regional operators report that substation gear is replacing land and fiber as the expansion constraint. This is beginning to converge with AI Markets chatter.",
    image_url: null,
    reference_url: "https://example.com/grid-lead-times",
    chart_url: "https://example.com/grid-chart",
    embed_url: null,
    confidence_score: 87,
    ai_narrative_tags: ["grid", "datacenters", "bottleneck"],
    contradiction_score: 24,
    sentiment_overlay: "Divergent",
    likes_count: 27,
    amplifies_count: 18,
    comments_count: 19,
    created_at: new Date(Date.now() - 1000 * 60 * 67).toISOString(),
    updated_at: now,
    author: demoOperators[1],
    flock: demoFlocks[1],
  },
  {
    id: "demo-signal-3",
    author_id: "demo-op-3",
    flock_id: "demo-flock-policy",
    title: "Policy language is shifting from model risk to infrastructure dependency",
    body: "Draft language from two committees frames AI resilience as an energy and supply-chain issue. This may pull infrastructure operators into AI governance conversations.",
    image_url: null,
    reference_url: "https://example.com/policy-shift",
    chart_url: null,
    embed_url: "https://example.com/policy-brief",
    confidence_score: 83,
    ai_narrative_tags: ["policy", "resilience", "infrastructure"],
    contradiction_score: 31,
    sentiment_overlay: "Neutral",
    likes_count: 22,
    amplifies_count: 16,
    comments_count: 15,
    created_at: new Date(Date.now() - 1000 * 60 * 92).toISOString(),
    updated_at: now,
    author: demoOperators[2],
    flock: demoFlocks[2],
  },
  {
    id: "demo-signal-4",
    author_id: "demo-op-1",
    flock_id: "demo-flock-ai",
    title: "GPU supply narratives are lagging behind power-market constraints",
    body: "Operator conversations are converging on the same point: availability of watts may now explain more deployment delay than availability of accelerators.",
    image_url: null,
    reference_url: null,
    chart_url: "https://example.com/power-vs-gpu",
    embed_url: null,
    confidence_score: 89,
    ai_narrative_tags: ["gpu", "power", "deployment"],
    contradiction_score: 12,
    sentiment_overlay: "Constructive",
    likes_count: 41,
    amplifies_count: 26,
    comments_count: 11,
    created_at: new Date(Date.now() - 1000 * 60 * 24).toISOString(),
    updated_at: now,
    author: demoOperators[0],
    flock: demoFlocks[0],
  },
];

export const demoSignals: SignalWithAuthor[] = [
  ...baseDemoSignals,
  ...seededAiSignals.slice(0, 6).map((signal, index) => {
    const author = demoOperators.find((operator) => operator.username === signal.agentUsername) ?? demoOperators[0];
    const flock = demoFlocks.find((item) => item.slug === signal.flockSlug) ?? demoFlocks[index % demoFlocks.length];

    return {
      id: `demo-agent-signal-${index + 1}`,
      author_id: author.id,
      flock_id: flock.id,
      title: signal.title,
      body: signal.body,
      image_url: null,
      reference_url: null,
      chart_url: null,
      embed_url: null,
      confidence_score: signal.confidence,
      ai_narrative_tags: signal.tags,
      contradiction_score: signal.contradiction,
      sentiment_overlay: signal.sentiment,
      likes_count: 18 + index * 3,
      amplifies_count: 9 + index * 2,
      comments_count: 5 + index,
      created_at: new Date(Date.now() - 1000 * 60 * (18 + index * 13)).toISOString(),
      updated_at: now,
      author,
      flock,
    };
  }),
];

export const demoPulseSignals: PulseSignal[] = demoSignals.map((signal, index) => ({
  ...signal,
  pulse_score: [94, 82, 71, 101][index],
  velocity: [4.8, 3.4, 2.7, 5.6][index],
  acceleration: [84, 67, 54, 96][index],
  amplification_velocity: [2.2, 1.6, 1.1, 2.9][index],
  comment_velocity: [1.3, 1.7, 1.2, 1.1][index],
  recent_growth_weight: 2.1,
  anomaly_score: [3.4, 6.8, 4.5, 2.9][index],
  pulse_labels: index === 3 ? ["High Momentum", "Pulse Candidate"] : ["Velocity Rising", "Emerging Cluster"],
  topic_terms: signal.ai_narrative_tags ?? [],
}));

export const demoClusters: PulseCluster[] = [
  {
    id: "compute-power-convergence",
    title: "Compute / Power / Infrastructure",
    terms: ["compute", "power", "infrastructure", "grid"],
    signals: [demoPulseSignals[0], demoPulseSignals[1], demoPulseSignals[3]],
    pulse_score: 277,
    anomaly_score: 6.8,
    flock_count: 2,
    narrative: "AI Markets and Critical Infrastructure Signals are converging around power availability as the near-term constraint.",
  },
  {
    id: "policy-infra-shift",
    title: "Policy / Resilience / Dependency",
    terms: ["policy", "resilience", "infrastructure"],
    signals: [demoPulseSignals[2]],
    pulse_score: 71,
    anomaly_score: 4.5,
    flock_count: 1,
    narrative: "Policy watchers are reframing AI governance around physical infrastructure dependency.",
  },
];

export const demoBriefs: BriefWithCandidate[] = [
  {
    id: "demo-brief-1",
    title: "Compute expansion is becoming a power-market problem",
    cluster_key: "compute-power-convergence",
    summary:
      "Operators across AI Markets and Critical Infrastructure are converging on a shared assessment: power interconnects, transformers, and regional energy agreements are becoming stronger predictors of AI deployment velocity than GPU supply alone.",
    narratives: [
      "Compute procurement is shifting attention from accelerator scarcity to energy availability.",
      "Grid equipment lead times are creating second-order deployment risk.",
      "Policy language is beginning to connect AI resilience to infrastructure dependency.",
    ],
    contradictions: [
      "Some operators still attribute delays primarily to GPU allocation, while infrastructure Signals point to grid constraints.",
    ],
    consensus_shifts: ["Consensus is moving from chip-centric bottlenecks toward power and interconnect timelines."],
    sentiment_movement: "Constructive but urgent. Operators are aligning around a clearer constraint model.",
    flock_summary: "AI Markets is generating the strongest Pulse, with Critical Infrastructure amplifying the evidence layer.",
    source_signal_ids: ["demo-signal-1", "demo-signal-2", "demo-signal-4"],
    status: "ready",
    error_message: null,
    generated_by: "demo-op-3",
    generated_at: now,
    created_at: now,
    updated_at: now,
    candidate: {
      cluster_key: "compute-power-convergence",
      title: "Compute / Power / Infrastructure",
      pulse_score: 277,
      signal_count: 3,
      source_signal_ids: ["demo-signal-1", "demo-signal-2", "demo-signal-4"],
    },
  },
];

export function getDemoGraph(): IntelligenceGraph {
  const nodes: GraphNode[] = [
    ...demoPulseSignals.map((signal) => ({
      id: `signal:${signal.id}`,
      label: signal.title,
      kind: "signal" as const,
      weight: 20,
      pulse: signal.pulse_score,
      meta: `v${signal.velocity}/h`,
    })),
    ...demoOperators.map((operator) => ({
      id: `operator:${operator.id}`,
      label: operator.display_name,
      kind: "operator" as const,
      weight: 24,
      pulse: operator.pulse_influence_score ?? 0,
      meta: `@${operator.username}`,
    })),
    ...demoFlocks.map((flock) => ({
      id: `flock:${flock.id}`,
      label: flock.name,
      kind: "flock" as const,
      weight: 22,
      pulse: flock.members_count / 4,
      meta: `${flock.members_count} operators`,
    })),
    ...demoClusters.map((cluster) => ({
      id: `cluster:${cluster.id}`,
      label: cluster.title,
      kind: "cluster" as const,
      weight: 28,
      pulse: cluster.pulse_score,
      meta: "Pulse cluster",
    })),
    {
      id: "brief:demo-brief-1",
      label: "Compute expansion brief",
      kind: "brief",
      weight: 22,
      pulse: 91,
      meta: "AI Brief ready",
    },
  ];

  const edges: GraphEdge[] = demoPulseSignals.flatMap((signal) => [
    {
      id: `author:${signal.id}`,
      source: `operator:${signal.author_id}`,
      target: `signal:${signal.id}`,
      kind: "authored",
      strength: 2,
    },
    {
      id: `flock:${signal.id}`,
      source: `flock:${signal.flock_id}`,
      target: `signal:${signal.id}`,
      kind: "belongs_to",
      strength: 2,
    },
    {
      id: `cluster:${signal.id}`,
      source: signal.id === "demo-signal-3" ? "cluster:policy-infra-shift" : "cluster:compute-power-convergence",
      target: `signal:${signal.id}`,
      kind: "converges",
      strength: 3,
    },
  ]);

  const rooms: CollaborationRoom[] = demoFlocks.map((flock) => ({
    id: flock.id,
    name: flock.name,
    detail: flock.description ?? "Demo intelligence room",
    operators: flock.members_count,
    signal_count: demoSignals.filter((signal) => signal.flock_id === flock.id).length,
    pulse_score: demoPulseSignals
      .filter((signal) => signal.flock_id === flock.id)
      .reduce((total, signal) => total + signal.pulse_score, 0),
  }));

  return {
    nodes,
    edges: [
      ...edges,
      {
        id: "brief-demo-edge",
        source: "brief:demo-brief-1",
        target: "cluster:compute-power-convergence",
        kind: "summarizes",
        strength: 3,
      },
    ],
    radar: demoClusters.map((cluster, index) => ({
      id: cluster.id,
      label: cluster.title,
      angle: index * 118 + 34,
      radius: Math.max(24, 120 - cluster.pulse_score / 4),
      score: cluster.pulse_score,
      anomaly: cluster.anomaly_score,
      acceleration: cluster.signals.reduce((total, signal) => total + signal.acceleration, 0),
    })),
    narratives: demoClusters.map((cluster) => ({
      id: cluster.id,
      title: cluster.title,
      summary: cluster.narrative,
      consensus_shift: Math.min(100, Math.round(cluster.pulse_score / 3)),
      contradiction_risk: Math.min(100, Math.round(cluster.anomaly_score * 10)),
      operator_alignment: 84,
    })),
    collaborationRooms: rooms,
    updatedAt: now,
  };
}
