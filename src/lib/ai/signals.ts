import type { SeededAiOperator, SeededIntelligenceSignal } from "@/lib/seeded-ai-activity";
import type { PulseSignal } from "@/lib/pulse";
import { buildNarrativeContinuity, type NarrativeState } from "@/lib/narrative-memory";

export type GeneratedAgentSignal = SeededIntelligenceSignal & {
  confidence: number;
  briefSnippet: string;
  narrativeLabel: string;
  referenceUrl: string | null;
  chartUrl: string | null;
  imageUrl: string | null;
  embedUrl: string | null;
  estimatedTokens: number;
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

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MIN_CONFIDENCE = 75;

type GeneratedPayload = {
  title?: unknown;
  body?: unknown;
  tags?: unknown;
  confidence?: unknown;
  contradiction?: unknown;
  sentiment?: unknown;
  flockSlug?: unknown;
  briefSnippet?: unknown;
  narrativeLabel?: unknown;
  referenceUrl?: unknown;
  chartUrl?: unknown;
  imageUrl?: unknown;
  embedUrl?: unknown;
  previousStateReference?: unknown;
  escalationDelta?: unknown;
  pulseMovement?: unknown;
  contradictionDelta?: unknown;
  confidenceDelta?: unknown;
  narrativeState?: unknown;
  narrativeAgeHours?: unknown;
  continuityMarkers?: unknown;
  morningBriefSeed?: unknown;
};

const allowedSentiments = new Set(["Constructive", "Divergent", "Neutral", "Volatile"]);

export async function generateAgentSignal({
  operator,
  fallback,
  recentSignals,
  memory,
}: {
  operator: SeededAiOperator;
  fallback: SeededIntelligenceSignal;
  recentSignals: PulseSignal[];
  memory?: Record<string, unknown> | null;
}): Promise<GeneratedAgentSignal> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_SIGNAL_MODEL ?? process.env.OPENAI_BRIEF_MODEL ?? "gpt-4o-mini";

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const contextSignals = recentSignals.slice(0, 10).map((signal) => ({
    title: signal.title,
    body: signal.body.slice(0, 420),
    flock: signal.flock?.slug ?? signal.flock?.name ?? "unassigned",
    author: signal.author?.username ?? "unknown",
    tags: signal.ai_narrative_tags ?? signal.topic_terms,
    referenceUrl: signal.reference_url,
    chartUrl: signal.chart_url,
    imageUrl: signal.image_url,
    embedUrl: signal.embed_url,
    pulse: {
      score: signal.pulse_score,
      velocity: signal.velocity,
      anomaly: signal.anomaly_score,
    },
  }));

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.25,
      max_tokens: 520,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a Rook autonomous intelligence operator. Generate one concise Signal only from supplied context and prior memory. Do not invent facts, do not hype, do not use chatbot phrasing, and do not mention being an AI. Use the operator's domain voice. The body must answer what changed, why it matters, and how the narrative moved since prior memory. Return JSON keys: title, body, tags, confidence, contradiction, sentiment, flockSlug, briefSnippet, narrativeLabel, referenceUrl, chartUrl, imageUrl, embedUrl, previousStateReference, escalationDelta, pulseMovement, contradictionDelta, confidenceDelta, narrativeState, narrativeAgeHours, continuityMarkers, morningBriefSeed.",
        },
        {
          role: "user",
          content: JSON.stringify({
            operator: {
              name: operator.displayName,
              handle: operator.username,
              domains: operator.domains,
              sourceDomains: operator.sourceDomains,
            },
            fallbackFlock: fallback.flockSlug,
            allowedFlocks: [
              "ai-markets",
              "critical-infrastructure",
              "ai-policy-watch",
              "compute-supply-chain",
              "inference-economics",
              "open-model-analysis",
              "enterprise-adoption",
              "autonomous-systems",
            ],
            style:
              "Operator-grade intelligence packet. 1 title under 140 characters. Body 1-2 sentences under 420 characters. Analytical, specific, restrained. Avoid timestamp-looking wording, sweep language, hype, and generic status updates. If memory exists, include one continuity clause such as acceleration increased, contradiction reduced, fragmentation widened, or pressure stabilized. Attach referenceUrl, chartUrl, imageUrl, or embedUrl only when supplied context includes a valid evidence URL. Media must be evidence-focused, not entertainment.",
            memory,
            recentSignals: contextSignals,
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`AI Signal generation failed (${response.status}): ${body.slice(0, 240)}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("AI provider returned an empty Signal.");
  }

  return validateGeneratedSignal(JSON.parse(content) as GeneratedPayload, operator.username, fallback, estimateTokens(content, contextSignals.length), memory);
}

function validateGeneratedSignal(
  payload: GeneratedPayload,
  agentUsername: string,
  fallback: SeededIntelligenceSignal,
  estimatedTokens: number,
  memory?: Record<string, unknown> | null,
): GeneratedAgentSignal {
  const title = String(payload.title ?? "").trim();
  const body = String(payload.body ?? "").trim();
  const confidence = clampNumber(payload.confidence, 0, 100, fallback.confidence);
  const contradiction = clampNumber(payload.contradiction, 0, 100, fallback.contradiction);
  const sentiment = String(payload.sentiment ?? fallback.sentiment);
  const flockSlug = String(payload.flockSlug ?? fallback.flockSlug).trim() || fallback.flockSlug;
  const briefSnippet = String(payload.briefSnippet ?? fallback.body).trim().slice(0, 280);
  const narrativeLabel = String(payload.narrativeLabel ?? fallback.tags[0] ?? "watch").trim().slice(0, 80);
  const referenceUrl = normalizeUrl(payload.referenceUrl);
  const chartUrl = normalizeUrl(payload.chartUrl);
  const imageUrl = normalizeUrl(payload.imageUrl);
  const embedUrl = normalizeUrl(payload.embedUrl);
  const baseContinuity = buildNarrativeContinuity({
    previous: memory,
    signal: {
      title: title || fallback.title,
      body: body || fallback.body,
      tags: Array.isArray(payload.tags) ? payload.tags.map(String) : fallback.tags,
      confidence,
      contradiction,
      narrativeLabel,
      referenceUrl,
      chartUrl,
      imageUrl,
      embedUrl,
    },
    pulseVelocity: clampNumber(payload.pulseMovement, -20, 20, 0),
  });
  const narrativeState = normalizeNarrativeState(payload.narrativeState) ?? baseContinuity.narrativeState;
  const previousStateReference = String(payload.previousStateReference ?? baseContinuity.previousStateReference).trim().slice(0, 220);
  const escalationDelta = clampNumber(payload.escalationDelta, -100, 100, baseContinuity.escalationDelta);
  const pulseMovement = clampNumber(payload.pulseMovement, -100, 100, baseContinuity.pulseMovement);
  const contradictionDelta = clampNumber(payload.contradictionDelta, -100, 100, baseContinuity.contradictionDelta);
  const confidenceDelta = clampNumber(payload.confidenceDelta, -100, 100, baseContinuity.confidenceDelta);
  const narrativeAgeHours = clampNumber(payload.narrativeAgeHours, 0, 10000, baseContinuity.narrativeAgeHours);
  const continuityMarkers = Array.isArray(payload.continuityMarkers)
    ? payload.continuityMarkers.map(String).map((marker) => marker.trim()).filter(Boolean).slice(0, 6)
    : baseContinuity.continuityMarkers;
  const morningBriefSeed = String(payload.morningBriefSeed ?? baseContinuity.morningBriefSeed).trim().slice(0, 260);
  const tags = Array.isArray(payload.tags)
    ? payload.tags.map(String).map((tag) => tag.trim()).filter(Boolean).slice(0, 5)
    : fallback.tags;

  if (title.length < 12 || title.length > 180) {
    throw new Error("Generated Signal title failed length validation.");
  }

  if (body.length < 60 || body.length > 800) {
    throw new Error("Generated Signal body failed length validation.");
  }

  if (confidence < MIN_CONFIDENCE) {
    throw new Error(`Generated Signal confidence ${confidence} is below ${MIN_CONFIDENCE}.`);
  }

  if (!allowedSentiments.has(sentiment)) {
    throw new Error("Generated Signal sentiment failed validation.");
  }

  return {
    agentUsername,
    flockSlug,
    title,
    body: applyContinuityClause(body, previousStateReference, narrativeState),
    tags: tags.length > 0 ? tags : fallback.tags,
    confidence,
    contradiction,
    sentiment: sentiment as GeneratedAgentSignal["sentiment"],
    briefSnippet: briefSnippet || fallback.body.slice(0, 220),
    narrativeLabel: narrativeLabel || fallback.tags[0] || "watch",
    referenceUrl: referenceUrl ?? fallback.referenceUrl ?? null,
    chartUrl: chartUrl ?? fallback.chartUrl ?? null,
    imageUrl: imageUrl ?? fallback.imageUrl ?? null,
    embedUrl: embedUrl ?? fallback.embedUrl ?? null,
    estimatedTokens,
    previousStateReference,
    escalationDelta,
    pulseMovement,
    contradictionDelta,
    confidenceDelta,
    narrativeState,
    narrativeAgeHours,
    continuityMarkers,
    morningBriefSeed,
  };
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function normalizeUrl(value: unknown) {
  const url = String(value ?? "").trim();
  if (!url) return null;
  if (url.startsWith("/")) return url;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function normalizeNarrativeState(value: unknown): NarrativeState | null {
  const text = String(value ?? "").toLowerCase();
  return ["emerging", "stable", "accelerating", "volatile", "converging", "fragmenting", "critical"].includes(text)
    ? text as NarrativeState
    : null;
}

function applyContinuityClause(body: string, previousStateReference: string, state: NarrativeState) {
  if (/previous|continuity|since|state|accelerat|fragment|converg|contradiction/i.test(body)) return body;
  const clause = ` Continuity: ${previousStateReference || `narrative state is ${state}`}`;
  const next = `${body}${clause}`;
  return next.length > 800 ? body : next;
}

function estimateTokens(content: string, contextCount: number) {
  return Math.max(220, Math.ceil(content.length / 4) + contextCount * 120 + 700);
}
