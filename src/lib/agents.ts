import { getNarrativeSystem } from "@/lib/narratives";
import { seededAiOperators } from "@/lib/seeded-ai-activity";

export type AgentKind =
  | "News Sentinel"
  | "Compute Radar"
  | "Market Pulse"
  | "Policy Watch"
  | "Open Source Monitor"
  | "Narrative Observer";

export type IntelligenceAgent = {
  id: string;
  name: AgentKind;
  domain: string;
  mission: string;
  status: "monitoring" | "escalating" | "briefing" | "quiet";
  confidence: number;
  last_action: string;
  signal_quality_score: number;
};

export type AgentActivity = {
  id: string;
  agent: AgentKind;
  label: string;
  detail: string;
  severity: "low" | "medium" | "high" | "critical";
  created_at: string;
};

export type AlertPreference = {
  id: string;
  label: string;
  type: "narrative" | "topic" | "flock" | "anomaly" | "pulse";
  severity: "low" | "medium" | "high" | "critical";
  enabled: boolean;
};

export type QualityFinding = {
  id: string;
  label: string;
  risk: number;
  detail: string;
};

export async function getAutonomousIntelligence() {
  const narratives = await getSafeNarratives();
  const top = narratives[0];
  const agents: IntelligenceAgent[] = seededAiOperators.map((agent, index) => {
    const status = deriveAgentStatus(agent.displayName as AgentKind, index, top?.acceleration_score ?? 0, top?.fragmentation_score ?? 0);

    return {
      id: agent.username.replaceAll("_", "-"),
      name: agent.displayName as AgentKind,
      domain: agent.domains.join(", "),
      mission: agent.bio,
      status,
      confidence: Math.min(96, (top?.confidence_score ?? 72) + index * 2),
      last_action: deriveAgentAction(agent.displayName as AgentKind, top?.title),
      signal_quality_score: Math.min(97, 84 + index * 2),
    };
  });

  const activity: AgentActivity[] = agents.map((agent, index) => ({
    id: `${agent.id}-${index}`,
    agent: agent.name,
    label:
      agent.status === "briefing"
        ? `${agent.name} generated Brief candidate`
        : agent.status === "escalating"
          ? `${agent.name} escalated anomaly`
          : `${agent.name} monitoring narrative field`,
    detail: agent.last_action,
    severity: agent.status === "escalating" ? "high" : agent.status === "briefing" ? "medium" : "low",
    created_at: new Date(Date.now() - index * 11 * 60 * 1000).toISOString(),
  }));

  const alerts: AlertPreference[] = [
    { id: "narrative", label: "Narrative acceleration", type: "narrative", severity: "high", enabled: true },
    { id: "topic", label: "Compute and power topics", type: "topic", severity: "medium", enabled: true },
    { id: "flock", label: "Flock convergence", type: "flock", severity: "medium", enabled: true },
    { id: "anomaly", label: "Anomaly events", type: "anomaly", severity: "critical", enabled: true },
    { id: "pulse", label: "Pulse candidates", type: "pulse", severity: "high", enabled: false },
  ];

  const quality: QualityFinding[] = narratives.slice(0, 4).map((narrative) => ({
    id: narrative.id,
    label: narrative.title,
    risk: Math.min(100, narrative.volatility_score + narrative.fragmentation_score / 3),
    detail:
      narrative.contradictions.length > 0
        ? "Contradiction edges require operator review before automated escalation."
        : "No manipulation pattern detected; continue passive monitoring.",
  }));

  return { agents, activity, alerts, quality, narratives };
}

async function getSafeNarratives() {
  try {
    return await getNarrativeSystem();
  } catch (error) {
    console.error("[agents] getNarrativeSystem failed after defensive fallback", error);
    return [];
  }
}

function deriveAgentStatus(
  name: AgentKind,
  index: number,
  acceleration: number,
  fragmentation: number,
): IntelligenceAgent["status"] {
  if (name === "Compute Radar" && acceleration > 45) return "escalating";
  if (name === "Narrative Observer" && fragmentation > 40) return "escalating";
  if (name === "Open Source Monitor") return "briefing";
  return index % 3 === 0 ? "monitoring" : index % 3 === 1 ? "escalating" : "briefing";
}

function deriveAgentAction(name: AgentKind, topNarrative?: string) {
  const actions: Record<AgentKind, string> = {
    "News Sentinel": topNarrative ? `Cross-checked source movement in ${topNarrative}` : "Monitoring policy and news feed deltas",
    "Compute Radar": "Detected compute-power coupling across active Signals",
    "Market Pulse": "Mapped AI capex pressure against inference economics",
    "Policy Watch": "Tracked compute governance language drift",
    "Open Source Monitor": "Prepared open-model reliability Brief candidate",
    "Narrative Observer": topNarrative ? `Detected alignment drift in ${topNarrative}` : "Tracking consensus drift",
  };

  return actions[name];
}
