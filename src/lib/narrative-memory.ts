export type NarrativeState =
  | "emerging"
  | "stable"
  | "accelerating"
  | "volatile"
  | "converging"
  | "fragmenting"
  | "critical";

export type AgentNarrativeMemory = {
  version: 1;
  agent_key: string;
  last_signal_id: string | null;
  previous_signal_titles: string[];
  previous_confidence: number | null;
  confidence_history: number[];
  contradiction_history: number[];
  escalation_history: Array<{ state: NarrativeState; score: number; at: string }>;
  pulse_velocity_history: number[];
  pulse_acceleration_history: number[];
  narrative_clusters: string[];
  source_references: string[];
  previous_narrative: string | null;
  narrative_state: NarrativeState;
  narrative_age_hours: number;
  continuity_markers: string[];
  morning_brief_seed: string | null;
  updated_at: string;
};

export type NarrativeContinuity = {
  previousStateReference: string;
  escalationDelta: number;
  pulseMovement: number;
  contradictionDelta: number;
  confidenceDelta: number;
  narrativeState: NarrativeState;
  narrativeAgeHours: number;
  continuityMarkers: string[];
  morningBriefSeed: string;
};

type SignalMemoryInput = {
  title: string;
  body: string;
  tags: string[];
  confidence: number;
  contradiction: number;
  narrativeLabel?: string | null;
  referenceUrl?: string | null;
  chartUrl?: string | null;
  imageUrl?: string | null;
  embedUrl?: string | null;
};

type MemoryBuildInput = {
  previous: Record<string, unknown> | AgentNarrativeMemory | null | undefined;
  agentKey: string;
  signal: SignalMemoryInput;
  signalId: string | null;
  pulseVelocity?: number;
  pulseAcceleration?: number;
  now?: Date;
};

export function normalizeAgentMemory(memory: Record<string, unknown> | AgentNarrativeMemory | null | undefined): AgentNarrativeMemory | null {
  if (!memory || typeof memory !== "object") return null;
  const raw = memory as Record<string, unknown>;

  const updatedAt = stringValue(raw.updated_at) ?? new Date().toISOString();
  const agentKey = stringValue(raw.agent_key) ?? "unknown";
  const previousTitles = stringArray(raw.previous_signal_titles);
  const legacyNarrative = stringValue(raw.previous_narrative);
  const confidenceHistory = numberArray(raw.confidence_history);
  const previousConfidence = numberValue(raw.previous_confidence) ?? lastNumber(confidenceHistory);
  const contradictionHistory = numberArray(raw.contradiction_history);
  const escalationHistory = normalizeEscalationHistory(raw.escalation_history);
  const state = normalizeNarrativeState(raw.narrative_state) ?? lastEscalationState(escalationHistory) ?? "stable";

  return {
    version: 1,
    agent_key: agentKey,
    last_signal_id: stringValue(raw.last_signal_id),
    previous_signal_titles: previousTitles,
    previous_confidence: previousConfidence,
    confidence_history: confidenceHistory,
    contradiction_history: contradictionHistory,
    escalation_history: escalationHistory,
    pulse_velocity_history: numberArray(raw.pulse_velocity_history),
    pulse_acceleration_history: numberArray(raw.pulse_acceleration_history),
    narrative_clusters: stringArray(raw.narrative_clusters ?? raw.active_topics),
    source_references: stringArray(raw.source_references),
    previous_narrative: legacyNarrative,
    narrative_state: state,
    narrative_age_hours: Math.max(0, numberValue(raw.narrative_age_hours) ?? hoursSince(updatedAt)),
    continuity_markers: stringArray(raw.continuity_markers),
    morning_brief_seed: stringValue(raw.morning_brief_seed),
    updated_at: updatedAt,
  };
}

export function buildNarrativeContinuity({
  previous,
  signal,
  pulseVelocity = 0,
  pulseAcceleration = 0,
  now = new Date(),
}: Omit<MemoryBuildInput, "agentKey" | "signalId">): NarrativeContinuity {
  const memory = normalizeAgentMemory(previous);
  const previousConfidence = memory?.previous_confidence ?? lastNumber(memory?.confidence_history) ?? signal.confidence;
  const previousContradiction = lastNumber(memory?.contradiction_history) ?? signal.contradiction;
  const confidenceDelta = signal.confidence - previousConfidence;
  const contradictionDelta = signal.contradiction - previousContradiction;
  const previousVelocity = lastNumber(memory?.pulse_velocity_history) ?? 0;
  const pulseMovement = Number((pulseVelocity - previousVelocity).toFixed(1));
  const escalationScore = scoreEscalation(signal.confidence, signal.contradiction, pulseVelocity, pulseAcceleration);
  const previousEscalation = lastEscalationScore(memory?.escalation_history) ?? escalationScore;
  const escalationDelta = escalationScore - previousEscalation;
  const narrativeAgeHours = memory ? Math.max(0, Math.round((now.getTime() - Date.parse(memory.updated_at)) / 36_000) / 100) : 0;
  const narrativeState = deriveNarrativeState({
    confidence: signal.confidence,
    contradiction: signal.contradiction,
    confidenceDelta,
    contradictionDelta,
    pulseVelocity,
    pulseAcceleration,
    escalationScore,
    hasMemory: Boolean(memory),
  });
  const previousStateReference = buildPreviousStateReference(memory, signal, narrativeState);
  const continuityMarkers = [
    `state:${narrativeState}`,
    formatDelta("escalation", escalationDelta),
    formatDelta("confidence", confidenceDelta),
    formatDelta("contradiction", contradictionDelta),
    formatDelta("pulse", pulseMovement),
  ].filter(Boolean);

  return {
    previousStateReference,
    escalationDelta,
    pulseMovement,
    contradictionDelta,
    confidenceDelta,
    narrativeState,
    narrativeAgeHours,
    continuityMarkers,
    morningBriefSeed: buildMorningBriefSeed(signal, narrativeState, escalationDelta, contradictionDelta),
  };
}

export function buildMemorySnapshot({
  previous,
  agentKey,
  signal,
  signalId,
  pulseVelocity = 0,
  pulseAcceleration = 0,
  now = new Date(),
}: MemoryBuildInput): AgentNarrativeMemory {
  const memory = normalizeAgentMemory(previous);
  const continuity = buildNarrativeContinuity({ previous: memory, signal, pulseVelocity, pulseAcceleration, now });
  const escalationScore = scoreEscalation(signal.confidence, signal.contradiction, pulseVelocity, pulseAcceleration);

  return {
    version: 1,
    agent_key: agentKey,
    last_signal_id: signalId,
    previous_signal_titles: appendLimited(memory?.previous_signal_titles ?? [], signal.title, 8),
    previous_confidence: signal.confidence,
    confidence_history: appendLimited(memory?.confidence_history ?? [], signal.confidence, 16),
    contradiction_history: appendLimited(memory?.contradiction_history ?? [], signal.contradiction, 16),
    escalation_history: appendLimited(memory?.escalation_history ?? [], {
      state: continuity.narrativeState,
      score: escalationScore,
      at: now.toISOString(),
    }, 16),
    pulse_velocity_history: appendLimited(memory?.pulse_velocity_history ?? [], pulseVelocity, 16),
    pulse_acceleration_history: appendLimited(memory?.pulse_acceleration_history ?? [], pulseAcceleration, 16),
    narrative_clusters: appendUniqueLimited(memory?.narrative_clusters ?? [], signal.tags, 12),
    source_references: appendUniqueLimited(
      memory?.source_references ?? [],
      [signal.referenceUrl, signal.chartUrl, signal.imageUrl, signal.embedUrl].filter((url): url is string => Boolean(url)),
      12,
    ),
    previous_narrative: signal.narrativeLabel ?? signal.tags[0] ?? memory?.previous_narrative ?? null,
    narrative_state: continuity.narrativeState,
    narrative_age_hours: continuity.narrativeAgeHours,
    continuity_markers: continuity.continuityMarkers,
    morning_brief_seed: continuity.morningBriefSeed,
    updated_at: now.toISOString(),
  };
}

export function continuityTags(continuity: Pick<NarrativeContinuity, "narrativeState" | "escalationDelta" | "pulseMovement" | "contradictionDelta">) {
  return [
    "continuity",
    `state:${continuity.narrativeState}`,
    `delta:escalation:${signed(continuity.escalationDelta)}`,
    `delta:pulse:${signed(continuity.pulseMovement)}`,
    `delta:contradiction:${signed(continuity.contradictionDelta)}`,
  ];
}

function deriveNarrativeState({
  confidence,
  contradiction,
  confidenceDelta,
  contradictionDelta,
  pulseVelocity,
  pulseAcceleration,
  escalationScore,
  hasMemory,
}: {
  confidence: number;
  contradiction: number;
  confidenceDelta: number;
  contradictionDelta: number;
  pulseVelocity: number;
  pulseAcceleration: number;
  escalationScore: number;
  hasMemory: boolean;
}): NarrativeState {
  if (escalationScore >= 78 || (confidence >= 88 && contradiction >= 52) || contradiction >= 58) return "critical";
  if (contradiction >= 45 || contradictionDelta >= 12) return "volatile";
  if (contradictionDelta >= 7 && confidenceDelta <= 2) return "fragmenting";
  if (pulseAcceleration >= 8 || pulseVelocity >= 3 || confidenceDelta >= 6) return "accelerating";
  if (contradictionDelta <= -8 && confidenceDelta >= -2) return "converging";
  return hasMemory ? "stable" : "emerging";
}

function buildPreviousStateReference(memory: AgentNarrativeMemory | null, signal: SignalMemoryInput, state: NarrativeState) {
  if (!memory) {
    return `Initial memory state established for ${signal.tags[0] ?? "this narrative"}; tracking from ${state}.`;
  }

  const lastTitle = latest(memory.previous_signal_titles) ?? memory.previous_narrative ?? signal.tags[0] ?? "prior sweep";
  return `Previous state was ${memory.narrative_state}; last reference: ${lastTitle}.`;
}

function buildMorningBriefSeed(signal: SignalMemoryInput, state: NarrativeState, escalationDelta: number, contradictionDelta: number) {
  return `${signal.tags[0] ?? "Narrative"} is ${state}; escalation ${signed(escalationDelta)}, contradiction ${signed(contradictionDelta)}. ${signal.title}`;
}

function scoreEscalation(confidence: number, contradiction: number, pulseVelocity: number, pulseAcceleration: number) {
  return clamp(Math.round(confidence * 0.38 + contradiction * 0.42 + Math.max(0, pulseVelocity) * 7 + Math.max(0, pulseAcceleration) * 3), 0, 100);
}

function formatDelta(label: string, value: number) {
  if (!Number.isFinite(value)) return "";
  return `${label}:${signed(value)}`;
}

function signed(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

function normalizeNarrativeState(value: unknown): NarrativeState | null {
  const text = String(value ?? "").toLowerCase();
  return ["emerging", "stable", "accelerating", "volatile", "converging", "fragmenting", "critical"].includes(text)
    ? text as NarrativeState
    : null;
}

function normalizeEscalationHistory(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const state = normalizeNarrativeState(record.state);
    const score = numberValue(record.score);
    const at = stringValue(record.at);
    return state && typeof score === "number" && at ? [{ state, score, at }] : [];
  });
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}

function numberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const numeric = typeof item === "string" ? item.match(/-?\d+(\.\d+)?/)?.[0] : item;
      return numberValue(numeric);
    })
    .filter((item): item is number => typeof item === "number");
}

function stringValue(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function numberValue(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function lastNumber(value: number[] | undefined) {
  return value && value.length > 0 ? value[value.length - 1] : null;
}

function lastEscalationScore(value: AgentNarrativeMemory["escalation_history"] | undefined) {
  return value && value.length > 0 ? value[value.length - 1]?.score ?? null : null;
}

function lastEscalationState(value: AgentNarrativeMemory["escalation_history"] | undefined) {
  return value && value.length > 0 ? value[value.length - 1]?.state ?? null : null;
}

function appendLimited<T>(current: T[], next: T, limit: number) {
  return [...current, next].slice(-limit);
}

function appendUniqueLimited(current: string[], next: string[], limit: number) {
  return [...new Set([...next, ...current].filter(Boolean))].slice(0, limit);
}

function hoursSince(iso: string) {
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round((Date.now() - parsed) / 36_000) / 100);
}

function latest<T>(items: T[]) {
  return items.length > 0 ? items[items.length - 1] : null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
