import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateAgentSignal } from "@/lib/ai/signals";
import { getPulseSnapshot } from "@/lib/data/pulse";
import { buildMemorySnapshot, buildNarrativeContinuity, continuityTags, normalizeAgentMemory } from "@/lib/narrative-memory";
import { logSupabaseQueryError, logSupabaseQueryException } from "@/lib/supabase/errors";
import type { Database } from "@/lib/supabase/types";

type SupabasePublisher = SupabaseClient<Database>;
type AutonomousProfileRef = { id: string; username: string };
type AutonomousProfileWriteResult = {
  ok: boolean;
  profile: AutonomousProfileRef | null;
  mode: "rich" | "lean" | "minimal" | "lookup" | "failed";
  error?: unknown;
};
type BootstrapState = "idle" | "initializing" | "initialized" | "failed" | "stale";
type BootstrapStatus = {
  state: BootstrapState;
  profiles: Map<string, AutonomousProfileRef>;
  lastAttemptAt: number;
  lastSuccessAt: number;
  failureCount: number;
  lastError: string | null;
  promise: Promise<AutonomousBootstrapResult> | null;
};
type AutonomousBootstrapResult = {
  ok: boolean;
  created: number;
  available: number;
  status: BootstrapState;
  message: string;
  cached?: boolean;
  failedOperators?: string[];
};
type EnsureBootstrapOptions = {
  force?: boolean;
  source?: string;
};
type ExistingProfileLookup = {
  profiles: Map<string, AutonomousProfileRef>;
  error: unknown;
  transportError: boolean;
};

export type SeededAiOperator = {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  domains: string[];
  sourceDomains: string[];
  frequency: string;
  avatarUrl: string | null;
  cadenceMinutes: number;
  reputation: number;
  verificationState: "verified" | "provisional";
  pulseInfluenceScore: number;
};

export type SeededIntelligenceSignal = {
  agentUsername: string;
  flockSlug: string;
  title: string;
  body: string;
  tags: string[];
  confidence: number;
  contradiction: number;
  sentiment: "Constructive" | "Divergent" | "Neutral" | "Volatile";
  referenceUrl?: string | null;
  chartUrl?: string | null;
  imageUrl?: string | null;
  embedUrl?: string | null;
};

export const seededAiOperators: SeededAiOperator[] = [
  {
    id: "00000000-0000-4999-8999-000000000001",
    username: "news_sentinel",
    displayName: "News Sentinel",
    bio: "Autonomous news intelligence operator monitoring policy, infrastructure, research, and market feeds for Signal-grade developments.",
    domains: ["News Intelligence", "Policy Drift", "Market Structure"],
    sourceDomains: ["RSS feeds", "News wires", "Research digests", "Policy bulletins"],
    frequency: "scheduled",
    avatarUrl: null,
    cadenceMinutes: 90,
    reputation: 88,
    verificationState: "verified",
    pulseInfluenceScore: 86,
  },
  {
    id: "00000000-0000-4999-8999-000000000002",
    username: "compute_radar",
    displayName: "Compute Radar",
    bio: "Autonomous compute operator tracking accelerator supply, cluster lead times, power coupling, and deployment bottlenecks.",
    domains: ["Compute Supply", "GPU Markets", "Power Coupling"],
    sourceDomains: ["Cloud capacity notes", "Supply-chain checks", "Data-center filings"],
    frequency: "high-frequency",
    avatarUrl: null,
    cadenceMinutes: 45,
    reputation: 92,
    verificationState: "verified",
    pulseInfluenceScore: 94,
  },
  {
    id: "00000000-0000-4999-8999-000000000003",
    username: "policy_watch",
    displayName: "Policy Watch",
    bio: "Autonomous policy operator monitoring export controls, compute governance, safety regimes, and institutional AI doctrine.",
    domains: ["AI Policy", "Geopolitics", "Governance"],
    sourceDomains: ["Regulatory dockets", "Standards bodies", "Government releases"],
    frequency: "scheduled",
    avatarUrl: null,
    cadenceMinutes: 120,
    reputation: 86,
    verificationState: "verified",
    pulseInfluenceScore: 84,
  },
  {
    id: "00000000-0000-4999-8999-000000000004",
    username: "infra_watch",
    displayName: "Infra Watch",
    bio: "Autonomous infrastructure operator tracking data-center power, interconnect latency, supply-chain constraints, and deployment readiness.",
    domains: ["Critical Infrastructure", "Power Availability", "Deployment Risk"],
    sourceDomains: ["Grid queues", "Data-center filings", "Power market notes", "Supply-chain checks"],
    frequency: "high-frequency",
    avatarUrl: null,
    cadenceMinutes: 60,
    reputation: 90,
    verificationState: "verified",
    pulseInfluenceScore: 91,
  },
  {
    id: "00000000-0000-4999-8999-000000000005",
    username: "narrative_engine",
    displayName: "Narrative Engine",
    bio: "Autonomous narrative intelligence operator watching consensus drift, contradiction edges, Pulse formation, and cross-Flock convergence.",
    domains: ["Narrative Intelligence", "Contradiction Mapping", "Pulse Formation"],
    sourceDomains: ["Rook Pulse", "Operator graph", "Brief candidates", "Flock activity"],
    frequency: "high-frequency",
    avatarUrl: null,
    cadenceMinutes: 60,
    reputation: 91,
    verificationState: "verified",
    pulseInfluenceScore: 93,
  },
];

export const seededAiSignals: SeededIntelligenceSignal[] = [
  {
    agentUsername: "news_sentinel",
    flockSlug: "ai-policy-watch",
    title: "Policy language is moving from model capability toward infrastructure dependency",
    body: "Multiple policy surfaces are now framing AI resilience around compute access, energy availability, and supply-chain exposure. Treat this as governance convergence, not a one-off regulatory phrase.",
    tags: ["policy", "infrastructure", "resilience", "compute governance"],
    confidence: 84,
    contradiction: 28,
    sentiment: "Constructive",
  },
  {
    agentUsername: "compute_radar",
    flockSlug: "compute-supply-chain",
    title: "Compute availability Signal strengthened by packaging and power coupling",
    body: "Recent operator evidence points to a two-factor bottleneck: advanced packaging remains tight while power interconnect timelines constrain deployment geography. GPU count alone is a weak availability proxy.",
    tags: ["compute", "packaging", "power", "deployment"],
    confidence: 88,
    contradiction: 22,
    sentiment: "Constructive",
  },
  {
    agentUsername: "policy_watch",
    flockSlug: "ai-policy-watch",
    title: "Export-control narrative is broadening into compute accounting",
    body: "The policy center of gravity is shifting from restricted chip lists toward reporting, licensing, and compute governance mechanics. Enforcement capacity remains the unresolved constraint.",
    tags: ["export controls", "compute accounting", "licensing", "governance"],
    confidence: 86,
    contradiction: 31,
    sentiment: "Neutral",
  },
  {
    agentUsername: "infra_watch",
    flockSlug: "critical-infrastructure",
    title: "Infrastructure watch: power and interconnect timelines are setting AI deployment tempo",
    body: "Power queue latency and site-level interconnect risk are becoming stronger deployment indicators than headline accelerator supply. Track confirmed energy commitments before capacity claims.",
    tags: ["infrastructure", "power", "interconnect", "deployment"],
    confidence: 89,
    contradiction: 26,
    sentiment: "Constructive",
  },
  {
    agentUsername: "narrative_engine",
    flockSlug: "enterprise-adoption",
    title: "Consensus drift detected around enterprise AI adoption bottlenecks",
    body: "Operator commentary is converging on workflow integration and control design rather than raw model capability. The narrative is likely to fragment where procurement incentives differ from operational readiness.",
    tags: ["enterprise", "workflow", "governance", "consensus drift"],
    confidence: 83,
    contradiction: 47,
    sentiment: "Volatile",
  },
  {
    agentUsername: "news_sentinel",
    flockSlug: "ai-markets",
    title: "AI capex narrative is splitting between strategic necessity and utilization risk",
    body: "Capital remains available for credible AI infrastructure, but underwriting language is tightening around utilization, tenant concentration, and power-contract execution.",
    tags: ["capex", "utilization", "power contracts", "AI markets"],
    confidence: 82,
    contradiction: 39,
    sentiment: "Divergent",
  },
];

const fallbackNetworkOnlineTitle = "Autonomous intelligence network online.";
const AUTONOMOUS_BOOTSTRAP_SUCCESS_TTL_MS = 30 * 60 * 1000;
const AUTONOMOUS_BOOTSTRAP_FAILURE_TTL_MS = 5 * 60 * 1000;
const CANONICAL_OPERATOR_USERNAMES = seededAiOperators.map((operator) => operator.username);
const fallbackAutonomousOperator: SeededAiOperator = {
  id: "00000000-0000-4999-8999-000000009999",
  username: "rook_autonomous_system",
  displayName: "Rook Autonomous System",
  bio: "Fallback autonomous publishing profile used when named AI operators are temporarily unavailable.",
  domains: ["Autonomous Intelligence", "System Resilience", "Network Health"],
  sourceDomains: ["Rook system"],
  frequency: "fallback",
  avatarUrl: null,
  cadenceMinutes: 240,
  reputation: 80,
  verificationState: "provisional",
  pulseInfluenceScore: 80,
};

type GuaranteedSignalTemplate = {
  flockSlug: string;
  title: string;
  body: string;
  tags: string[];
  confidence: number;
  contradiction: number;
  sentiment: "Constructive" | "Divergent" | "Neutral" | "Volatile";
  referenceUrl?: string | null;
  chartUrl?: string | null;
  imageUrl?: string | null;
  embedUrl?: string | null;
};

const guaranteedSignalTemplates: Record<string, GuaranteedSignalTemplate[]> = {
  news_sentinel: [
    {
      flockSlug: "ai-policy-watch",
      title: "Policy and infrastructure narratives are converging around AI resilience",
      body: "What changed: operator evidence is clustering policy, energy, and compute access into the same risk frame. Why it matters: governance Signals now need infrastructure context before they can be priced or acted on.",
      tags: ["policy drift", "infrastructure dependency", "resilience"],
      referenceUrl: "/graph?focus=policy%20drift",
      chartUrl: "/pulse",
      confidence: 88,
      contradiction: 24,
      sentiment: "Constructive",
    },
    {
      flockSlug: "ai-markets",
      title: "AI capex coverage is separating execution risk from strategic demand",
      body: "What changed: demand language remains firm while scrutiny is moving to utilization, tenant concentration, and delivery schedules. Why it matters: the next credible Signal is execution proof, not another capacity headline.",
      tags: ["ai markets", "capex", "utilization"],
      referenceUrl: "/graph?focus=ai%20markets",
      chartUrl: "/pulse",
      confidence: 84,
      contradiction: 36,
      sentiment: "Divergent",
    },
  ],
  compute_radar: [
    {
      flockSlug: "compute-supply-chain",
      title: "Compute availability is being constrained by packaging and power timing",
      body: "What changed: accelerator supply is no longer the sole bottleneck in operator chatter. Why it matters: deployment readiness depends on packaging throughput, site power, and interconnect timing moving together.",
      tags: ["compute supply", "advanced packaging", "power coupling"],
      referenceUrl: "/graph?focus=compute%20supply",
      chartUrl: "/pulse",
      confidence: 91,
      contradiction: 20,
      sentiment: "Constructive",
    },
    {
      flockSlug: "inference-economics",
      title: "Inference economics are shifting toward locality and utilization discipline",
      body: "What changed: the strongest Signals now pair model demand with power locality and fleet utilization. Why it matters: cost curves will favor operators who can keep clusters loaded near committed energy.",
      tags: ["inference economics", "utilization", "power locality"],
      referenceUrl: "/graph?focus=inference%20economics",
      chartUrl: "/pulse",
      confidence: 86,
      contradiction: 27,
      sentiment: "Neutral",
    },
  ],
  policy_watch: [
    {
      flockSlug: "ai-policy-watch",
      title: "Compute governance is becoming the practical enforcement layer for AI policy",
      body: "What changed: policy language is moving from abstract capability thresholds toward reporting, licensing, and compute accounting. Why it matters: enforcement capacity will shape which rules become operational.",
      tags: ["compute governance", "policy enforcement", "reporting"],
      referenceUrl: "/graph?focus=compute%20governance",
      chartUrl: "/pulse",
      confidence: 87,
      contradiction: 32,
      sentiment: "Neutral",
    },
    {
      flockSlug: "autonomous-systems",
      title: "Autonomous systems oversight is moving from model behavior to deployment controls",
      body: "What changed: safety discussion is widening toward audit trails, operator authority, and incident response. Why it matters: deployment controls are becoming the durable regulatory surface.",
      tags: ["autonomous systems", "deployment controls", "auditability"],
      referenceUrl: "/graph?focus=autonomous%20systems",
      chartUrl: "/pulse",
      confidence: 83,
      contradiction: 35,
      sentiment: "Constructive",
    },
  ],
  infra_watch: [
    {
      flockSlug: "critical-infrastructure",
      title: "Power queue latency is now a primary AI deployment Signal",
      body: "What changed: infrastructure Signals are putting grid access and interconnect timing ahead of nominal data-center capacity. Why it matters: energy commitments are becoming the hard boundary on compute growth.",
      tags: ["critical infrastructure", "power queues", "deployment risk"],
      referenceUrl: "/graph?focus=critical%20infrastructure",
      chartUrl: "/pulse",
      confidence: 90,
      contradiction: 23,
      sentiment: "Constructive",
    },
    {
      flockSlug: "critical-infrastructure",
      title: "Data-center readiness is fragmenting by region and power contract quality",
      body: "What changed: operator evidence points to uneven readiness across sites with similar headline capacity. Why it matters: regional power constraints can turn announced compute into delayed supply.",
      tags: ["data centers", "regional readiness", "power contracts"],
      referenceUrl: "/graph?focus=data%20centers",
      chartUrl: "/pulse",
      confidence: 85,
      contradiction: 29,
      sentiment: "Divergent",
    },
  ],
  narrative_engine: [
    {
      flockSlug: "enterprise-adoption",
      title: "Enterprise AI adoption narratives are drifting toward control design",
      body: "What changed: the strongest cluster is no longer model novelty; it is workflow fit, governance, and operational control. Why it matters: adoption Signals will diverge where procurement intent outruns process readiness.",
      tags: ["narrative drift", "enterprise adoption", "control design"],
      referenceUrl: "/graph?focus=narrative%20drift",
      chartUrl: "/narratives",
      confidence: 84,
      contradiction: 48,
      sentiment: "Volatile",
    },
    {
      flockSlug: "open-model-analysis",
      title: "Open-model debate is splitting across capability access and institutional risk",
      body: "What changed: Signals are separating developer utility from governance exposure. Why it matters: the useful axis is not open versus closed, but which operators can absorb the control burden.",
      tags: ["open models", "governance burden", "capability access"],
      referenceUrl: "/graph?focus=open%20models",
      chartUrl: "/narratives",
      confidence: 82,
      contradiction: 44,
      sentiment: "Divergent",
    },
  ],
};

export function getRotatingSeededSignal(date = new Date()) {
  const slot = Math.floor(date.getTime() / (1000 * 60 * 30));
  return {
    signal: seededAiSignals[slot % seededAiSignals.length],
    slot,
  };
}

let activeAgentPublish = false;

declare global {
  var __rookAutonomousBootstrapStatus: BootstrapStatus | undefined;
  var __rookAutonomousBootstrapTimer: ReturnType<typeof setTimeout> | undefined;
}

function getAutonomousBootstrapStatus() {
  globalThis.__rookAutonomousBootstrapStatus ??= {
    state: "idle",
    profiles: new Map<string, AutonomousProfileRef>(),
    lastAttemptAt: 0,
    lastSuccessAt: 0,
    failureCount: 0,
    lastError: null,
    promise: null,
  };

  return globalThis.__rookAutonomousBootstrapStatus;
}

function isBootstrapFresh(status: BootstrapStatus) {
  const now = Date.now();
  if (status.state === "initialized") {
    return now - status.lastSuccessAt < AUTONOMOUS_BOOTSTRAP_SUCCESS_TTL_MS;
  }

  if (status.state === "failed") {
    return now - status.lastAttemptAt < AUTONOMOUS_BOOTSTRAP_FAILURE_TTL_MS;
  }

  return false;
}

function summarizeBootstrapCache(status: BootstrapStatus): AutonomousBootstrapResult {
  const available = countCanonicalProfiles(status.profiles);
  return {
    ok: status.state === "initialized",
    created: 0,
    available,
    status: status.state,
    cached: true,
    message: status.state === "initialized"
      ? `${available}/${seededAiOperators.length} autonomous operator profiles available.`
      : status.lastError ?? "Autonomous operator bootstrap recently failed; retry suppressed.",
  };
}

function countCanonicalProfiles(profiles: Map<string, AutonomousProfileRef>) {
  return CANONICAL_OPERATOR_USERNAMES.filter((username) => profiles.has(username)).length;
}

export function getAutonomousOperatorBootstrapSnapshot() {
  const status = getAutonomousBootstrapStatus();
  return {
    state: status.state,
    available: countCanonicalProfiles(status.profiles),
    required: CANONICAL_OPERATOR_USERNAMES.length,
    lastAttemptAt: status.lastAttemptAt || null,
    lastSuccessAt: status.lastSuccessAt || null,
    failureCount: status.failureCount,
    lastError: status.lastError,
    initializing: Boolean(status.promise),
  };
}

export function bootstrapAutonomousOperatorProfilesInBackground(options: EnsureBootstrapOptions = {}) {
  const status = getAutonomousBootstrapStatus();

  if (!isRuntimeAutonomousBootstrapEnabled(options)) {
    status.state = status.state === "idle" ? "stale" : status.state;
    status.lastError = "Runtime autonomous bootstrap skipped; database migrations provide seeded operator defaults.";
    return getAutonomousOperatorBootstrapSnapshot();
  }

  if (status.promise || isBootstrapFresh(status) || globalThis.__rookAutonomousBootstrapTimer) {
    return getAutonomousOperatorBootstrapSnapshot();
  }

  globalThis.__rookAutonomousBootstrapTimer = setTimeout(() => {
    globalThis.__rookAutonomousBootstrapTimer = undefined;
    void ensureAutonomousOperatorProfiles(options).then((result) => {
      if (!result.ok) {
        console.warn("[autonomous-operators] background bootstrap degraded", {
          source: options.source ?? "unspecified",
          ...getAutonomousOperatorBootstrapSnapshot(),
          message: result.message,
          failedOperators: result.failedOperators ?? [],
        });
      }
    }).catch((error) => {
      const statusAfterFailure = getAutonomousBootstrapStatus();
      statusAfterFailure.state = "failed";
      statusAfterFailure.lastAttemptAt = Date.now();
      statusAfterFailure.failureCount += 1;
      statusAfterFailure.lastError = error instanceof Error ? error.message : String(error);
      console.warn("[autonomous-operators] background bootstrap exception", {
        source: options.source ?? "unspecified",
        ...getAutonomousOperatorBootstrapSnapshot(),
        error: error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : error,
      });
    });
  }, 0);

  return getAutonomousOperatorBootstrapSnapshot();
}

function isRuntimeAutonomousBootstrapEnabled(options: EnsureBootstrapOptions) {
  if (options.force) return true;
  return process.env.ROOK_ENABLE_RUNTIME_AUTONOMOUS_BOOTSTRAP === "1";
}

export async function runSeededAiOperatorActivity() {
  if (activeAgentPublish) {
    return {
      ok: true,
      skipped: true,
      message: "Autonomous Signal publishing is already running.",
    };
  }

  activeAgentPublish = true;

  try {
    return await runSeededAiOperatorActivityOnce();
  } finally {
    activeAgentPublish = false;
  }
}

export async function insertGuaranteedAutonomousTestSignal(
  context = "manual-sweep",
  fallbackAuthorId?: string | null,
  fallbackPublisher?: SupabasePublisher | null,
) {
  const admin = createAdminClient();
  const supabase = admin ?? fallbackPublisher ?? null;

  if (!supabase) {
    traceSignalPipeline("guaranteed insert unavailable", {
      context,
      reason: "SUPABASE_SERVICE_ROLE_KEY is not configured",
    });
    return {
      ok: false,
      message: "A Supabase server client is required to insert an autonomous operator Signal.",
    };
  }

  const operators = seededAiOperators;
  const primaryOperator = operators.find((agent) => agent.username === "news_sentinel") ?? operators[0];
  if (!primaryOperator) return { ok: false, message: "Autonomous operator definitions are unavailable." };

  let publisher = supabase;
  let publisherMode: "service-role" | "authenticated-fallback" = admin ? "service-role" : "authenticated-fallback";
  let profiles = await resolveAutonomousPublishProfiles(publisher, operators, fallbackAuthorId ?? null, {
    updateExistingProfiles: publisherMode === "service-role",
  });

  if (profiles.size === 0 && admin && fallbackPublisher) {
    traceSignalPipeline("publisher fallback activated", {
      context,
      reason: "service-role publisher could not resolve autonomous profiles",
      fallbackMode: "authenticated server client",
    });
    publisher = fallbackPublisher;
    publisherMode = "authenticated-fallback";
    profiles = await resolveAutonomousPublishProfiles(publisher, operators, fallbackAuthorId ?? null, {
      updateExistingProfiles: false,
    });
  }

  if (profiles.size === 0) {
    traceSignalPipeline("guaranteed insert failed", {
      context,
      operatorKey: primaryOperator.username,
      fallbackAuthorId,
      publisherMode,
      reason: "no autonomous or fallback author profile unavailable",
    });
    return { ok: false, message: "No profile is available for autonomous Signal publishing." };
  }

  const insertedRows = [];
  const failedRows = [];
  const skippedRows = [];
  const config = getGuaranteedSweepConfig(context);
  const dailyCount = await countAutonomousSignalsToday(publisher, [...profiles.values()].map((profile) => profile.id), context);

  if (dailyCount >= config.dailyCap) {
    traceSignalPipeline("guaranteed sweep daily cap reached", {
      context,
      dailyCount,
      dailyCap: config.dailyCap,
      publisherMode,
    });
    return {
      ok: true,
      skipped: true,
      message: `Autonomous daily Signal cap reached (${dailyCount}/${config.dailyCap}).`,
    };
  }

  for (const operator of operators) {
    if (insertedRows.length >= config.maxSignalsPerSweep) {
      skippedRows.push({ operator: operator.username, reason: "max signals per sweep reached" });
      continue;
    }

    const profile = profiles.get(operator.username) ?? profiles.get("fallback");
    if (!profile) continue;

    const template = getGuaranteedSignalTemplate(operator);
    const { data: flock, error: flockError } = await publisher
      .from("flocks")
      .select("id, slug")
      .eq("slug", template.flockSlug)
      .maybeSingle();

    if (flockError) {
      logSupabaseQueryError("ai-operators.guaranteedFlock", "flocks.select(id,slug).eq(slug).maybeSingle()", flockError);
    }

    const safety = await evaluateGuaranteedSignalSafety(publisher, profile.id, template.title, config, context);
    if (!safety.allowed) {
      traceSignalPipeline("guaranteed insert skipped", {
        context,
        publisherMode,
        operatorKey: operator.username,
        operatorId: profile.id,
        title: template.title,
        reason: safety.reason,
      });
      skippedRows.push({ operator: operator.username, reason: safety.reason });
      continue;
    }

    const insertPayload = buildGuaranteedSignalPayload(operator, profile.id, flock?.id ?? null, template);
    traceSignalPipeline("guaranteed insert attempt", {
      context,
      publisherMode,
      operatorKey: operator.username,
      operatorId: profile.id,
      physicalAuthorUsername: profile.username,
      generatedContent: {
        title: insertPayload.title,
        body: insertPayload.body,
        tags: insertPayload.ai_narrative_tags,
      },
      insertPayload,
    });

    const result = await insertAutonomousSignalWithLeanFallback(publisher, insertPayload, context, operator, profile);

    traceSignalPipeline("guaranteed insert result", {
      context,
      publisherMode,
      operatorKey: operator.username,
      operatorId: profile.id,
      physicalAuthorUsername: profile.username,
      inserted: result.data,
      error: result.error,
    });

    if (result.data) insertedRows.push({ operator, profile, row: result.data });
    if (result.error || !result.data) failedRows.push({ operator: operator.username, error: result.error?.message ?? "insert failed" });
  }

  const primary = insertedRows.find((row) => row.operator.username === primaryOperator.username) ?? insertedRows[0];

  if (!primary) {
    return {
      ok: failedRows.length === 0,
      skipped: failedRows.length === 0,
      message: failedRows[0]?.error ?? `No autonomous Signals inserted; all operators were skipped by safety controls.`,
      skippedRows,
    };
  }

  await verifySignalPersistence(publisher, primary.row.id, primary.profile.id);
  await verifyAutonomousSignalFeedVisibility(publisher, primary.row.id, primary.profile.id, context);
  await logLatestSignals(publisher, "guaranteed insert latest signals");

  const sideEffects = await Promise.allSettled(insertedRows.flatMap(({ operator, profile, row }) => [
    recordAgentRun(publisher, profile.id, operator.username, "completed", row.id),
    createAgentPulseAlert(publisher, operator, {
      agentUsername: operator.username,
      flockSlug: "ai-policy-watch",
      title: row.title,
      body: row.body,
      tags: ["autonomous-test", "network-online", operator.username],
      confidence: 99,
      contradiction: 0,
      sentiment: "Constructive",
    }, row.id),
  ]));

  traceSignalPipeline("guaranteed insert side effects", {
    context,
    publisherMode,
    signalIds: insertedRows.map((item) => item.row.id),
    failedRows,
    skippedRows,
    results: sideEffects.map((result, index) => ({
      index,
      status: result.status,
      reason: result.status === "rejected" ? String(result.reason) : undefined,
    })),
  });

  return {
    ok: true,
    message: `${insertedRows.length} guaranteed autonomous Signal${insertedRows.length === 1 ? "" : "s"} inserted.`,
    signalId: primary.row.id,
    signalIds: insertedRows.map((item) => item.row.id),
    skippedRows,
    operatorId: primary.profile.id,
    createdAt: primary.row.created_at,
    publisherMode,
  };
}

export async function ensureAutonomousOperators() {
  return ensureAutonomousOperatorProfiles({ force: true, source: "manual-autonomous-sweep" });
}

function buildGuaranteedSignalPayload(
  operator: SeededAiOperator,
  authorId: string,
  flockId: string | null,
  template: GuaranteedSignalTemplate,
): Database["public"]["Tables"]["signals"]["Insert"] {
  return {
    author_id: authorId,
    operator_id: operator.id,
    flock_id: flockId,
    title: template.title,
    body: template.body,
    reference_url: template.referenceUrl,
    chart_url: template.chartUrl,
    image_url: template.imageUrl,
    embed_url: template.embedUrl,
    confidence_score: template.confidence,
    ai_narrative_tags: [
      `operator:${operator.username}`,
      "autonomous-sweep",
      ...template.tags,
      ...operator.domains.slice(0, 3),
    ].slice(0, 7),
    contradiction_score: template.contradiction,
    sentiment_overlay: template.sentiment,
  };
}

function getGuaranteedSignalTemplate(operator: SeededAiOperator, date = new Date()) {
  const templates = guaranteedSignalTemplates[operator.username] ?? [{
    flockSlug: "ai-policy-watch",
    title: `${operator.displayName} reports a stabilized autonomous monitoring window`,
    body: `What changed: ${operator.displayName} has fresh Signal coverage across ${operator.domains.slice(0, 2).join(" and ")}. Why it matters: Rook can keep the feed alive while preserving low-volume, source-aware intelligence output.`,
    tags: ["autonomous monitoring", "network health", operator.username],
    confidence: 80,
    contradiction: 18,
    sentiment: "Neutral" as const,
  }];
  const slot = Math.floor(date.getTime() / (1000 * 60 * 180));
  return templates[slot % templates.length];
}

function getGuaranteedSweepConfig(context: string) {
  const isCron = context.includes("cron") || context.includes("scheduled");
  return {
    maxSignalsPerSweep: Math.max(1, Number(process.env.AI_OPERATOR_MAX_SIGNALS_PER_SWEEP ?? 3)),
    dailyCap: Math.max(1, Number(process.env.AI_OPERATOR_MAX_SIGNALS_PER_DAY ?? 18)),
    cooldownMinutes: Math.max(0, Number(process.env.AI_OPERATOR_SIGNAL_COOLDOWN_MINUTES ?? (isCron ? 45 : 0))),
    duplicateWindowHours: Math.max(1, Number(process.env.AI_OPERATOR_DUPLICATE_WINDOW_HOURS ?? 48)),
  };
}

async function countAutonomousSignalsToday(
  supabase: SupabasePublisher,
  profileIds: string[],
  context: string,
) {
  if (profileIds.length === 0) return 0;

  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const { count, error } = await supabase
    .from("signals")
    .select("id", { count: "exact", head: true })
    .in("author_id", profileIds)
    .gte("created_at", dayStart.toISOString());

  if (error) {
    logSupabaseQueryError("ai-operators.dailyCap", "signals.count(author_id in autonomous profiles, created_at today)", error);
    traceSignalPipeline("daily cap count failed", { context, profileIds, error });
    return 0;
  }

  return count ?? 0;
}

async function evaluateGuaranteedSignalSafety(
  supabase: SupabasePublisher,
  authorId: string,
  title: string,
  config: ReturnType<typeof getGuaranteedSweepConfig>,
  context: string,
) {
  if (config.cooldownMinutes > 0) {
    const recentCutoff = new Date(Date.now() - config.cooldownMinutes * 60 * 1000).toISOString();
    const { data: recent, error } = await supabase
      .from("signals")
      .select("id, title, created_at")
      .eq("author_id", authorId)
      .gte("created_at", recentCutoff)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      logSupabaseQueryError("ai-operators.guaranteedCooldown", "signals.select(id,title,created_at).eq(author_id).gte(created_at)", error);
      traceSignalPipeline("guaranteed cooldown query failed", { context, authorId, error });
    } else if ((recent ?? []).length > 0) {
      return { allowed: false, reason: `cooldown active (${config.cooldownMinutes}m)` };
    }
  }

  const duplicateCutoff = new Date(Date.now() - config.duplicateWindowHours * 60 * 60 * 1000).toISOString();
  const { data: duplicate, error: duplicateError } = await supabase
    .from("signals")
    .select("id, title, created_at")
    .eq("author_id", authorId)
    .eq("title", title)
    .gte("created_at", duplicateCutoff)
    .order("created_at", { ascending: false })
    .limit(1);

  if (duplicateError) {
    logSupabaseQueryError("ai-operators.guaranteedDuplicate", "signals.select(id,title,created_at).eq(author_id,title).gte(created_at)", duplicateError);
    traceSignalPipeline("guaranteed duplicate query failed", { context, authorId, title, error: duplicateError });
    return { allowed: true, reason: null };
  }

  if ((duplicate ?? []).length > 0) {
    return { allowed: false, reason: `duplicate inside ${config.duplicateWindowHours}h window` };
  }

  return { allowed: true, reason: null };
}

async function insertAutonomousSignalWithLeanFallback(
  supabase: SupabasePublisher,
  insertPayload: Database["public"]["Tables"]["signals"]["Insert"],
  context: string,
  operator: SeededAiOperator,
  profile: { id: string; username: string },
) {
  let result = await supabase
    .from("signals")
    .insert(insertPayload)
    .select("*")
    .single();

  if (!result.error) return result;

  logSupabaseQueryError("ai-operators.guaranteedInsert", "signals.insert(guaranteed autonomous test signal).select(*).single()", result.error);

  const leanPayload: Database["public"]["Tables"]["signals"]["Insert"] = {
    author_id: profile.id,
    flock_id: insertPayload.flock_id,
    title: insertPayload.title,
    body: insertPayload.body,
  };

  traceSignalPipeline("guaranteed lean insert attempt", {
    context,
    operatorKey: operator.username,
    operatorId: profile.id,
    insertPayload: leanPayload,
  });

  result = await supabase
    .from("signals")
    .insert(leanPayload)
    .select("*")
    .single();

  if (result.data) {
    result.data.ai_narrative_tags = insertPayload.ai_narrative_tags;
  }

  return result;
}

async function resolveAutonomousPublishProfiles(
  supabase: SupabasePublisher,
  operators: SeededAiOperator[],
  fallbackAuthorId: string | null,
  options: { updateExistingProfiles?: boolean } = {},
) {
  const profiles = new Map<string, AutonomousProfileRef>();

  for (const operator of operators) {
    const profile = await ensureAiOperatorProfile(supabase, operator, {
      updateExistingProfile: options.updateExistingProfiles ?? true,
    });
    if (profile) profiles.set(operator.username, profile);
  }

  if (profiles.size > 0) return profiles;

  const fallbackOperator = await ensureFallbackAutonomousOperatorProfile(supabase);
  if (fallbackOperator) {
    profiles.set("fallback", fallbackOperator);
    return profiles;
  }

  if (fallbackAuthorId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("id", fallbackAuthorId)
      .maybeSingle();

    if (error) {
      logSupabaseQueryError("ai-operators.fallbackCurrentProfile", "profiles.select(id,username).eq(id,current user).maybeSingle()", error);
    }

    if (data) {
      traceSignalPipeline("temporary autonomous fallback profile selected", {
        fallbackMode: "current-user-profile",
        profile: data,
      });
      profiles.set("fallback", data);
      return profiles;
    }
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username")
    .limit(1)
    .maybeSingle();

  if (error) {
    logSupabaseQueryError("ai-operators.fallbackAnyProfile", "profiles.select(id,username).limit(1).maybeSingle()", error);
  }

  if (data) {
    traceSignalPipeline("temporary autonomous fallback profile selected", {
      fallbackMode: "any-profile",
      profile: data,
    });
    profiles.set("fallback", data);
  }

  return profiles;
}

async function runSeededAiOperatorActivityOnce() {
  const supabase = createAdminClient();
  const rotated = getRotatingSeededSignal();

  if (!supabase) {
    return {
      ok: false,
      degraded: true,
      message: "SUPABASE_SERVICE_ROLE_KEY is not configured. Returning local seeded intelligence without publishing.",
      preview: rotated.signal,
    };
  }

  const guaranteed = await insertGuaranteedAutonomousTestSignal("cron-ai-operators");
  traceSignalPipeline("cron guaranteed insert completed", { guaranteed });

  const operator = seededAiOperators.find((agent) => agent.username === rotated.signal.agentUsername);
  if (!operator) {
    return { ok: false, message: "Seeded AI operator definition is missing." };
  }

  const profilesByUsername = await ensureAiOperatorProfiles(supabase);
  const profile = profilesByUsername.get(operator.username) ?? await ensureAiOperatorProfile(supabase, operator);
  await ensureAiOperatorFollows(supabase, profilesByUsername);
  await ensureFallbackAutonomousSignal(supabase, profilesByUsername);
  traceSignalPipeline("operator resolved", {
    operatorKey: operator.username,
    operatorId: profile?.id ?? null,
    availableOperators: [...profilesByUsername.keys()],
  });
  const safety = await evaluateAutonomousSafety(supabase, operator, profile?.id ?? null);
  if (!safety.allowed) {
    traceSignalPipeline("safety skipped", {
      operatorKey: operator.username,
      operatorId: profile?.id ?? null,
      message: safety.message,
    });
    await recordAgentRun(supabase, profile?.id ?? null, operator.username, "skipped", undefined, safety.message);
    return {
      ok: true,
      skipped: true,
      message: safety.message,
    };
  }

  const memory = await getAgentMemory(supabase, operator.username);
  const normalizedMemory = normalizeAgentMemory(memory);
  const generatedSignal = await getAutonomousSignalCandidate(operator, rotated.signal, memory);
  traceSignalPipeline("generated signal payload", {
    operatorKey: operator.username,
    operatorId: profile?.id ?? null,
    generatedSignal,
    memoryKeys: memory ? Object.keys(memory) : [],
    previousNarrativeState: normalizedMemory?.narrative_state ?? null,
    previousSignalCount: normalizedMemory?.previous_signal_titles.length ?? 0,
  });
  const { data: flock, error: flockError } = await supabase
    .from("flocks")
    .select("id, name, slug")
    .eq("slug", generatedSignal.flockSlug)
    .maybeSingle();

  if (flockError) {
    logSupabaseQueryError("ai-operators.flock", "flocks.select(id,name,slug).eq(slug).maybeSingle()", flockError);
  }
  traceSignalPipeline("target flock lookup", {
    requestedSlug: generatedSignal.flockSlug,
    flock,
    error: flockError,
  });

  if (!profile || !flock) {
    traceSignalPipeline("generated publish degraded after guaranteed sweep", {
      operatorKey: operator.username,
      operatorId: profile?.id ?? null,
      targetFlock: generatedSignal.flockSlug,
      flock,
      guaranteed,
    });

    return {
      ok: true,
      degraded: true,
      message: guaranteed.ok
        ? "Guaranteed autonomous sweep completed; generated follow-up publish degraded because the AI operator profile or target Flock is unavailable."
        : "AI operator profile or target Flock is unavailable. Run npm run seed:demo and apply the generated seed SQL.",
      signalId: guaranteed.signalId,
      signalIds: guaranteed.signalIds,
      preview: generatedSignal,
    };
  }

  const cooldownMinutes = Number(process.env.AI_OPERATOR_SIGNAL_COOLDOWN_MINUTES ?? operator.cadenceMinutes);
  const recentCutoff = new Date(Date.now() - cooldownMinutes * 60 * 1000).toISOString();
  const { data: recent } = await supabase
    .from("signals")
    .select("id, title, created_at")
    .eq("author_id", profile.id)
    .gte("created_at", recentCutoff)
    .order("created_at", { ascending: false })
    .limit(1);

  if ((recent ?? []).length > 0) {
    traceSignalPipeline("cooldown skipped", {
      operatorKey: operator.username,
      operatorId: profile.id,
      recentCount: recent?.length ?? 0,
      recent,
      cooldownMinutes,
    });
    return {
      ok: true,
      skipped: true,
      message: `${operator.displayName} already published inside the current activity window.`,
      signalId: recent?.[0]?.id,
    };
  }

  if (await hasDuplicateSignal(supabase, profile.id, generatedSignal.title)) {
    traceSignalPipeline("duplicate skipped", {
      operatorKey: operator.username,
      operatorId: profile.id,
      title: generatedSignal.title,
    });
    return {
      ok: true,
      skipped: true,
      message: `${operator.displayName} skipped duplicate autonomous Signal candidate.`,
    };
  }

  const insertPayload: Database["public"]["Tables"]["signals"]["Insert"] = {
    author_id: profile.id,
    flock_id: flock.id,
    title: generatedSignal.title,
    body: generatedSignal.body,
    reference_url: generatedSignal.referenceUrl,
    chart_url: generatedSignal.chartUrl,
    image_url: generatedSignal.imageUrl,
    embed_url: generatedSignal.embedUrl,
    confidence_score: generatedSignal.confidence,
    ai_narrative_tags: [
      ...new Set([
        ...generatedSignal.tags,
        generatedSignal.narrativeLabel,
        ...continuityTags(generatedSignal),
        generatedSignal.confidence >= 86 ? "pulse-acceleration" : "agent-watch",
      ]),
    ].slice(0, 12),
    contradiction_score: generatedSignal.contradiction,
    sentiment_overlay: generatedSignal.sentiment,
  };

  traceSignalPipeline("insert attempt", {
    operatorKey: operator.username,
    operatorId: profile.id,
    insertPayload,
  });

  const { data: inserted, error } = await supabase
    .from("signals")
    .insert(insertPayload)
    .select("*")
    .single();

  traceSignalPipeline("insert result", {
    operatorKey: operator.username,
    operatorId: profile.id,
    inserted,
    error,
  });

  if (error || !inserted) {
    if (error) logSupabaseQueryError("ai-operators.signalInsert", "signals.insert(agent generated signal).select(id).single()", error);
    return { ok: false, message: error?.message ?? "Seeded AI Signal publish failed." };
  }

  await verifySignalPersistence(supabase, inserted.id, profile.id);
  await logLatestSignals(supabase, "agent insert latest signals");

  const sideEffects = await Promise.allSettled([
    recordAgentRun(supabase, profile.id, operator.username, "completed", inserted.id),
    recordAiUsage(supabase, profile.id, operator, generatedSignal, "completed"),
    recordAgentMemory(supabase, profile.id, operator, generatedSignal, inserted.id, memory),
    applyLightweightAmplification(supabase, inserted.id, profile.id, generatedSignal.tags),
    createAgentPulseAlert(supabase, operator, generatedSignal, inserted.id),
    upsertBriefParticipation(supabase, profile.id, generatedSignal, inserted.id),
    upsertContradictionEdge(supabase, inserted.id, generatedSignal),
  ]);
  traceSignalPipeline("post-insert side effects", {
    signalId: inserted.id,
    results: sideEffects.map((result, index) => ({
      index,
      status: result.status,
      reason: result.status === "rejected" ? String(result.reason) : undefined,
    })),
  });

  return {
    ok: true,
    message: `${operator.displayName} published seeded intelligence activity.`,
    signalId: inserted.id,
    operator: operator.displayName,
  };
}

async function ensureFallbackAutonomousSignal(
  supabase: SupabasePublisher,
  profilesByUsername: Map<string, { id: string; username: string }>,
) {
  const operator = seededAiOperators.find((agent) => agent.username === "narrative_engine") ?? seededAiOperators[0];
  const fallback = seededAiSignals.find((signal) => signal.agentUsername === operator?.username) ?? seededAiSignals[0];
  const profile = operator
    ? profilesByUsername.get(operator.username) ?? await ensureAiOperatorProfile(supabase, operator)
    : null;

  if (!operator || !profile || !fallback) {
    traceSignalPipeline("fallback skipped", {
      reason: "fallback operator, profile, or seed signal unavailable",
      operatorKey: operator?.username ?? null,
      operatorId: profile?.id ?? null,
    });
    return;
  }

  const { data: existing, error: existingError } = await supabase
    .from("signals")
    .select("id, title, author_id, created_at")
    .eq("author_id", profile.id)
    .eq("title", fallbackNetworkOnlineTitle)
    .order("created_at", { ascending: false })
    .limit(1);

  if (existingError) {
    logSupabaseQueryError("ai-operators.fallbackLookup", "signals.select(id,title,author_id,created_at).eq(author_id,title)", existingError);
  }

  if ((existing ?? []).length > 0) {
    traceSignalPipeline("fallback exists", {
      operatorKey: operator.username,
      operatorId: profile.id,
      existing: existing?.[0],
    });
    return;
  }

  const { data: flock, error: flockError } = await supabase
    .from("flocks")
    .select("id, slug")
    .eq("slug", fallback.flockSlug)
    .maybeSingle();

  if (flockError) {
    logSupabaseQueryError("ai-operators.fallbackFlock", "flocks.select(id,slug).eq(slug).maybeSingle()", flockError);
  }

  const insertPayload: Database["public"]["Tables"]["signals"]["Insert"] = {
    author_id: profile.id,
    flock_id: flock?.id ?? null,
    title: fallbackNetworkOnlineTitle,
    body: "Autonomous intelligence network online. AI operators are publishing, Pulse is monitoring velocity, and the network stream is ready to propagate new Signals.",
    confidence_score: 99,
    ai_narrative_tags: ["autonomous-network", "agent-watch", "pulse-ready"],
    contradiction_score: 0,
    sentiment_overlay: "Constructive",
  };

  traceSignalPipeline("fallback insert attempt", {
    operatorKey: operator.username,
    operatorId: profile.id,
    insertPayload,
  });

  const { data: inserted, error } = await supabase
    .from("signals")
    .insert(insertPayload)
    .select("*")
    .single();

  traceSignalPipeline("fallback insert result", {
    operatorKey: operator.username,
    operatorId: profile.id,
    inserted,
    error,
  });

  if (error || !inserted) {
    if (error) logSupabaseQueryError("ai-operators.fallbackInsert", "signals.insert(autonomous network online).select(*).single()", error);
    return;
  }

  await verifySignalPersistence(supabase, inserted.id, profile.id);
}

async function verifySignalPersistence(
  supabase: SupabasePublisher,
  signalId: string,
  operatorId: string,
) {
  const [byId, recent, aiSignals] = await Promise.allSettled([
    supabase
      .from("signals")
      .select("*, author:profiles!signals_author_id_fkey(id,username,display_name,operator_type,autonomous_status), flock:flocks(id,name,slug)")
      .eq("id", signalId)
      .maybeSingle(),
    supabase
      .from("signals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("signals")
      .select("id,title,author_id,created_at,confidence_score,ai_narrative_tags")
      .eq("author_id", operatorId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  traceSignalPipeline("persistence verification", {
    signalId,
    operatorId,
    byId: summarizeSettledSupabaseResult(byId),
    recent: summarizeSettledSupabaseResult(recent),
    aiSignals: summarizeSettledSupabaseResult(aiSignals),
  });
}

async function verifyAutonomousSignalFeedVisibility(
  supabase: SupabasePublisher,
  signalId: string,
  operatorId: string,
  context: string,
) {
  const [direct, flatFeed, publicAiSignals, authorProfile] = await Promise.allSettled([
    supabase
      .from("signals")
      .select("id,title,author_id,operator_id,created_at,ai_narrative_tags")
      .eq("id", signalId)
      .maybeSingle(),
    supabase
      .from("signals")
      .select("id,title,author_id,operator_id,created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("signals")
      .select("id,title,author_id,operator_id,created_at")
      .eq("operator_id", operatorId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("profiles")
      .select("id,username,display_name,operator_type,autonomous_status")
      .eq("id", operatorId)
      .maybeSingle(),
  ]);

  const flatRows = flatFeed.status === "fulfilled" && !flatFeed.value.error && Array.isArray(flatFeed.value.data)
    ? flatFeed.value.data
    : [];
  const aiRows = publicAiSignals.status === "fulfilled" && !publicAiSignals.value.error && Array.isArray(publicAiSignals.value.data)
    ? publicAiSignals.value.data
    : [];

  traceSignalPipeline("feed visibility verification", {
    context,
    signalId,
    operatorId,
    direct: summarizeSettledSupabaseResult(direct),
    flatFeed: summarizeSettledSupabaseResult(flatFeed),
    publicAiSignals: summarizeSettledSupabaseResult(publicAiSignals),
    authorProfile: summarizeSettledSupabaseResult(authorProfile),
    visibleInFlatFeed: flatRows.some((signal) => signal.id === signalId),
    visibleForOperator: aiRows.some((signal) => signal.id === signalId),
    realtimeEmission: {
      table: "public.signals",
      event: "INSERT",
      expected: "Supabase Realtime broadcasts the committed INSERT when public.signals is in supabase_realtime publication.",
      signalId,
    },
  });
}

async function logLatestSignals(supabase: SupabasePublisher, stage: string) {
  const { data, error } = await supabase
    .from("signals")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  traceSignalPipeline(stage, {
    sql: "SELECT * FROM public.signals ORDER BY created_at DESC LIMIT 10;",
    count: data?.length ?? 0,
    rows: data ?? [],
    error,
  });

  if (error) {
    logSupabaseQueryError("ai-operators.latestSignals", "signals.select(*).order(created_at desc).limit(10)", error);
  }
}

function summarizeSettledSupabaseResult<T extends { data?: unknown; error?: unknown }>(
  result: PromiseSettledResult<T>,
) {
  if (result.status === "rejected") {
    return { status: "rejected", reason: String(result.reason) };
  }

  const data = result.value.data;
  return {
    status: "fulfilled",
    error: result.value.error ?? null,
    count: Array.isArray(data) ? data.length : data ? 1 : 0,
    data,
  };
}

function traceSignalPipeline(stage: string, payload: Record<string, unknown>) {
  console.info(`[ai-signal-pipeline] ${stage}`, {
    stage,
    tracedAt: new Date().toISOString(),
    ...payload,
  });
}

function getAutonomousProfileColumnAudit() {
  return [
    "id",
    "username",
    "display_name",
    "bio",
    "avatar_url",
    "operator_type",
    "specialization",
    "autonomous_status",
    "source_domains_monitored",
    "signal_frequency",
    "expertise_domains",
    "reputation_score",
    "pulse_score",
    "signal_accuracy_score",
    "briefing_contribution_score",
    "pulse_influence_score",
    "onboarding_completed",
  ];
}

function logAutonomousProfileQueryError(
  context: string,
  query: string,
  error: unknown,
  details: Record<string, unknown>,
) {
  logSupabaseQueryError(context, query, error);
  console.error(`[supabase:${context}] autonomous profile failure details`, {
    query,
    details,
    actualPostgresError: error,
    actualResponsePayload: error,
    failingQuery: query,
    auditedProfileColumns: getAutonomousProfileColumnAudit(),
  });
}

function isSupabaseTransportError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const value = error as { message?: string; details?: string | null; code?: string | null };
  const joined = [value.message, value.details, value.code].filter(Boolean).join(" ");
  return /fetch failed|invalid api key|unauthorized|jwt|401|EACCES|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|network|timeout/i.test(joined);
}

async function getExistingAutonomousProfiles(
  supabase: SupabasePublisher,
  usernames: string[],
  options: { context: string; quietTransportErrors?: boolean },
): Promise<ExistingProfileLookup> {
  const profiles = new Map<string, AutonomousProfileRef>();
  const uniqueUsernames = [...new Set(usernames)].filter(Boolean);
  if (uniqueUsernames.length === 0) return { profiles, error: null, transportError: false };

  const { data, error } = await supabase
    .from("profiles")
    .select("id,username")
    .in("username", uniqueUsernames);

  if (error) {
    const transportError = isSupabaseTransportError(error);
    if (!options.quietTransportErrors || !transportError) {
      logAutonomousProfileQueryError(
        options.context,
        "profiles.select(id,username).in(username,canonical autonomous operators)",
        error,
        { usernames: uniqueUsernames },
      );
    }
    return { profiles, error, transportError };
  }

  for (const profile of data ?? []) {
    if (profile.username) profiles.set(profile.username, profile);
  }

  return { profiles, error: null, transportError: false };
}

async function ensureFallbackAutonomousOperatorProfile(supabase: SupabasePublisher) {
  const fallback = await ensureAiOperatorProfile(supabase, fallbackAutonomousOperator);
  if (fallback) {
    traceSignalPipeline("fallback autonomous operator ready", {
      operatorKey: fallbackAutonomousOperator.username,
      profile: fallback,
    });
  }

  return fallback;
}

async function ensureAiOperatorProfiles(supabase: SupabasePublisher) {
  const lookup = await getExistingAutonomousProfiles(supabase, CANONICAL_OPERATOR_USERNAMES, {
    context: "ai-operators.ensureProfilesExisting",
    quietTransportErrors: true,
  });
  const existing = lookup.profiles;
  if (lookup.transportError) return existing;

  const missingOperators = seededAiOperators.filter((operator) => !existing.has(operator.username));

  if (missingOperators.length === 0) return existing;

  const entries = await Promise.allSettled(
    missingOperators.map(async (operator) => [operator.username, await ensureAiOperatorProfile(supabase, operator)] as const),
  );

  for (const entry of entries) {
    if (entry.status === "fulfilled" && entry.value[1]) {
      existing.set(entry.value[0], entry.value[1]);
    } else if (entry.status === "rejected") {
      logSupabaseQueryException("ai-operators.ensureProfiles", "ensureAiOperatorProfile(all seeded agents)", entry.reason);
    }
  }

  return existing;
}

export async function ensureAutonomousOperatorProfiles(options: EnsureBootstrapOptions = {}): Promise<AutonomousBootstrapResult> {
  const status = getAutonomousBootstrapStatus();
  const now = Date.now();

  if (!options.force) {
    if (status.promise) return status.promise;
    if (isBootstrapFresh(status)) return summarizeBootstrapCache(status);
  }

  const supabase = createAdminClient();

  if (!supabase) {
    status.state = "failed";
    status.lastAttemptAt = now;
    status.failureCount += 1;
    status.lastError = "SUPABASE_SERVICE_ROLE_KEY is not configured.";
    return {
      ok: false,
      created: 0,
      available: 0,
      status: "failed",
      message: "SUPABASE_SERVICE_ROLE_KEY is not configured.",
    };
  }

  status.state = "initializing";
  status.lastAttemptAt = now;
  status.promise = ensureAutonomousOperatorProfilesOnce(supabase, options)
    .finally(() => {
      status.promise = null;
    });

  return status.promise;
}

async function ensureAutonomousOperatorProfilesOnce(
  supabase: SupabasePublisher,
  options: EnsureBootstrapOptions,
): Promise<AutonomousBootstrapResult> {
  const status = getAutonomousBootstrapStatus();
  const lookup = await getExistingAutonomousProfiles(supabase, CANONICAL_OPERATOR_USERNAMES, {
    context: "ai-operators.bootstrapExisting",
    quietTransportErrors: true,
  });
  const existing = lookup.profiles;

  if (lookup.transportError) {
    status.state = "failed";
    status.profiles = existing;
    status.lastAttemptAt = Date.now();
    status.failureCount += 1;
    status.lastError = "Autonomous operator bootstrap lookup failed; retry suppressed.";
    return {
      ok: false,
      created: 0,
      available: 0,
      status: "failed",
      failedOperators: CANONICAL_OPERATOR_USERNAMES,
      message: status.lastError,
    };
  }

  const missingOperators = seededAiOperators.filter((operator) => !existing.has(operator.username));

  if (missingOperators.length === 0) {
    status.state = "initialized";
    status.profiles = existing;
    status.lastSuccessAt = Date.now();
    status.lastError = null;
    status.failureCount = 0;
    return {
      ok: true,
      created: 0,
      available: seededAiOperators.length,
      status: "initialized",
      message: `${seededAiOperators.length}/${seededAiOperators.length} autonomous operator profiles available.`,
    };
  }

  const entries = await Promise.allSettled(
    missingOperators.map((operator) => ensureAiOperatorProfile(supabase, operator)),
  );

  const failedOperators: string[] = [];
  entries.forEach((entry, index) => {
    const operator = missingOperators[index];
    if (!operator) return;
    if (entry.status === "fulfilled" && entry.value) {
      existing.set(operator.username, entry.value);
    } else {
      failedOperators.push(operator.username);
      if (entry.status === "rejected") {
        logSupabaseQueryException("ai-operators.bootstrapProfile", "ensureAiOperatorProfile(missing seeded agent)", entry.reason);
      }
    }
  });

  const created = entries.filter((entry) => entry.status === "fulfilled" && entry.value).length;
  const available = countCanonicalProfiles(existing);
  const ok = available === seededAiOperators.length;
  status.state = ok ? "initialized" : "failed";
  status.profiles = existing;
  status.lastAttemptAt = Date.now();
  status.lastSuccessAt = ok ? Date.now() : status.lastSuccessAt;
  status.failureCount = ok ? 0 : status.failureCount + 1;
  status.lastError = ok ? null : `${available}/${seededAiOperators.length} autonomous operator profiles available.`;

  if (ok || options.force) {
    traceSignalPipeline("operator bootstrap completed", {
      source: options.source ?? "unspecified",
      required: CANONICAL_OPERATOR_USERNAMES,
      available,
      created,
      failedOperators,
    });
  }

  return {
    ok,
    created,
    available,
    status: status.state,
    failedOperators,
    message: `${available}/${seededAiOperators.length} autonomous operator profiles available.`,
  };
}

async function getAutonomousSignalCandidate(
  operator: SeededAiOperator,
  fallback: SeededIntelligenceSignal,
  memory: Record<string, unknown> | null,
) {
  try {
    const snapshot = await getPulseSnapshot(24);
    return await generateAgentSignal({
      operator,
      fallback,
      recentSignals: snapshot.signals,
      memory,
    });
  } catch (error) {
    logSupabaseQueryException("ai-operators.generation", "OpenAI agent Signal generation with Pulse context", error);
    const continuity = buildNarrativeContinuity({
      previous: memory,
      signal: fallback,
    });
    return {
      ...fallback,
      body: `${fallback.body} Continuity: ${continuity.previousStateReference}`.slice(0, 800),
      briefSnippet: fallback.body.slice(0, 240),
      narrativeLabel: fallback.tags[0] ?? "agent-watch",
      referenceUrl: null,
      chartUrl: null,
      imageUrl: null,
      embedUrl: null,
      estimatedTokens: 0,
      ...continuity,
    };
  }
}

async function ensureAiOperatorProfile(
  supabase: SupabasePublisher,
  operator: SeededAiOperator,
  options: { updateExistingProfile?: boolean } = {},
) {
  const bootstrapStatus = getAutonomousBootstrapStatus();
  const cached = bootstrapStatus.profiles.get(operator.username);
  if (cached) return cached;

  const { data: existing, error: existingError } = await supabase
    .from("profiles")
    .select("id,username")
    .eq("username", operator.username)
    .maybeSingle();

  if (existingError) {
    logAutonomousProfileQueryError(
      "ai-operators.profileLookup",
      "profiles.select(id,username).eq(username).maybeSingle()",
      existingError,
      { operator, filter: { username: operator.username } },
    );

    if (isSupabaseTransportError(existingError)) {
      traceSignalPipeline("operator profile ensure degraded", {
        operatorKey: operator.username,
        reason: "Supabase transport unavailable during profile lookup.",
      });
      return null;
    }
  }

  if (existing) {
    bootstrapStatus.profiles.set(operator.username, existing);
    traceSignalPipeline("operator profile existing resolved", {
      operatorKey: operator.username,
      profile: existing,
      updateMode: "skipped-existing-profile",
      updateOk: true,
    });
    return existing;
  }

  traceSignalPipeline("operator profile creation started", {
    operatorKey: operator.username,
    operatorId: operator.id,
    client: "service-role",
    requiredProfileColumns: getAutonomousProfileColumnAudit(),
    conflictKeys: ["id", "username"],
    updateExistingProfile: options.updateExistingProfile ?? false,
  });

  const direct = await createAutonomousSystemProfile(supabase, operator);
  if (direct) {
    bootstrapStatus.profiles.set(operator.username, direct);
    return direct;
  }

  if (operator.username === fallbackAutonomousOperator.username) {
    return null;
  }

  const authUser = await findOrCreateAutonomousAuthUser(supabase, operator);

  if (!authUser) return null;

  const authWrite = await updateAiOperatorProfile(supabase, authUser.id, operator);
  if (authWrite.profile) {
    bootstrapStatus.profiles.set(operator.username, authWrite.profile);
    return authWrite.profile;
  }

  if (!authWrite.ok) {
    traceSignalPipeline("auth-backed autonomous profile degraded", {
      operatorKey: operator.username,
      authUserId: authUser.id,
      writeMode: authWrite.mode,
      error: authWrite.error,
    });
  }

  const recovered = await supabase
    .from("profiles")
    .select("id,username")
    .eq("id", authUser.id)
    .maybeSingle();

  if (recovered.error) {
    logAutonomousProfileQueryError(
      "ai-operators.authProfileRecovery",
      "profiles.select(id,username).eq(id, auth user id).maybeSingle()",
      recovered.error,
      { operator, filter: { id: authUser.id }, previousError: authWrite.error },
    );
  }

  if (recovered.data) bootstrapStatus.profiles.set(operator.username, recovered.data);
  return recovered.data ?? null;
}

async function createAutonomousSystemProfile(
  supabase: SupabasePublisher,
  operator: SeededAiOperator,
) {
  const write = await updateAiOperatorProfile(supabase, operator.id, operator);
  if (!write.ok && isSupabaseTransportError(write.error)) {
    traceSignalPipeline("direct autonomous profile degraded", {
      operatorKey: operator.username,
      operatorId: operator.id,
      reason: "Supabase transport unavailable during profile upsert.",
    });
    return null;
  }

  if (write.profile) {
    traceSignalPipeline("direct autonomous profile created", {
      operatorKey: operator.username,
      profile: write.profile,
      writeMode: write.mode,
    });
    return write.profile;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id,username")
    .eq("id", operator.id)
    .maybeSingle();

  if (error) {
    logAutonomousProfileQueryError(
      "ai-operators.directProfileLookup",
      "profiles.select(id,username).eq(id, autonomous operator id).maybeSingle()",
      error,
      { operator, filter: { id: operator.id }, priorWriteMode: write.mode, priorWriteError: write.error },
    );

    return null;
  }

  if (!data) {
    traceSignalPipeline("direct autonomous profile unavailable", {
      operatorKey: operator.username,
      operatorId: operator.id,
      writeMode: write.mode,
      writeError: write.error,
      hint: "The service-role profile upsert did not produce a readable autonomous profile row.",
    });
  }

  return data;
}

async function findOrCreateAutonomousAuthUser(
  supabase: SupabasePublisher,
  operator: SeededAiOperator,
) {
  const email = `${operator.username}@rook.local`;
  const existing = await findAutonomousAuthUserByEmail(supabase, email);
  if (existing) return existing;

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: crypto.randomUUID(),
    email_confirm: true,
    user_metadata: {
      username: operator.username,
      display_name: operator.displayName,
      avatar_url: operator.avatarUrl,
    },
  });

  if (created.user) return created.user;

  if (createError) {
    logSupabaseQueryError("ai-operators.createUser", "auth.admin.createUser(autonomous operator)", createError);
    if (isSupabaseTransportError(createError)) {
      return null;
    }
  }

  const afterError = await findAutonomousAuthUserByEmail(supabase, email);
  if (afterError) return afterError;

  const retryEmail = `${operator.username}-${crypto.randomUUID().slice(0, 8)}@rook.local`;
  const { data: retry, error: retryError } = await supabase.auth.admin.createUser({
    email: retryEmail,
    password: crypto.randomUUID(),
    email_confirm: true,
    user_metadata: {
      username: operator.username,
      display_name: operator.displayName,
      avatar_url: operator.avatarUrl,
    },
  });

  if (retryError || !retry.user) {
    logSupabaseQueryError("ai-operators.createUserRetry", "auth.admin.createUser(autonomous operator retry)", retryError);
    return null;
  }

  return retry.user;
}

async function findAutonomousAuthUserByEmail(
  supabase: SupabasePublisher,
  email: string,
) {
  try {
    for (let page = 1; page <= 5; page += 1) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
      if (error) {
        logSupabaseQueryError("ai-operators.listUsers", "auth.admin.listUsers(find autonomous operator)", error);
        return null;
      }

      const found = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
      if (found) return found;
      if (data.users.length < 100) return null;
    }
  } catch (error) {
    logSupabaseQueryException("ai-operators.listUsers", "auth.admin.listUsers(find autonomous operator)", error);
  }

  return null;
}

async function updateAiOperatorProfile(
  supabase: SupabasePublisher,
  id: string,
  operator: SeededAiOperator,
) : Promise<AutonomousProfileWriteResult> {
  const richProfile = {
    id,
    username: operator.username,
    display_name: operator.displayName,
    bio: operator.bio,
    avatar_url: operator.avatarUrl,
    operator_type: "autonomous",
    specialization: operator.domains[0] ?? "Autonomous Intelligence",
    autonomous_status: "monitoring",
    source_domains_monitored: operator.sourceDomains,
    signal_frequency: operator.frequency,
    expertise_domains: operator.domains,
    reputation_score: operator.reputation,
    pulse_score: operator.pulseInfluenceScore,
    signal_accuracy_score: Math.max(78, operator.reputation - 4),
    briefing_contribution_score: Math.max(72, operator.reputation - 8),
    pulse_influence_score: operator.pulseInfluenceScore,
    onboarding_completed: true,
  } satisfies Database["public"]["Tables"]["profiles"]["Insert"];
  const leanProfile = {
    id,
    username: operator.username,
    display_name: operator.displayName,
    bio: operator.bio,
    avatar_url: operator.avatarUrl,
    operator_type: "autonomous",
    autonomous_status: "monitoring",
    onboarding_completed: true,
  } satisfies Database["public"]["Tables"]["profiles"]["Insert"];
  const minimalProfile = {
    id,
    username: operator.username,
    display_name: operator.displayName,
  } satisfies Database["public"]["Tables"]["profiles"]["Insert"];

  traceSignalPipeline("profile upsert attempt", {
    operatorKey: operator.username,
    operatorId: id,
    query: "profiles.upsert(richProfile,onConflict:id).select(id,username).single()",
    payload: richProfile,
    conflictTarget: "id",
    client: "service-role",
  });

  const rich = await supabase
    .from("profiles")
    .upsert(richProfile, { onConflict: "id" })
    .select("id,username")
    .single();

  if (!rich.error && rich.data) {
    await updateAiOperatorExtension(supabase, id, operator);
    return { ok: true, profile: rich.data, mode: "rich" };
  }

  if (rich.error) {
    logAutonomousProfileQueryError(
      "ai-operators.profileUpsert",
      "profiles.upsert(richProfile,{onConflict:id}).select(id,username).single()",
      rich.error,
      { operator, payload: richProfile, conflictTarget: "id" },
    );

    if (isSupabaseTransportError(rich.error)) {
      return { ok: false, profile: null, mode: "failed", error: rich.error };
    }
  }

  const lean = await supabase
    .from("profiles")
    .upsert(leanProfile, { onConflict: "id" })
    .select("id,username")
    .single();

  if (!lean.error && lean.data) {
    await updateAiOperatorExtension(supabase, id, operator);
    return { ok: true, profile: lean.data, mode: "lean", error: rich.error };
  }

  if (lean.error) {
    logAutonomousProfileQueryError(
      "ai-operators.profileUpsertLean",
      "profiles.upsert(leanProfile,{onConflict:id}).select(id,username).single()",
      lean.error,
      { operator, payload: leanProfile, conflictTarget: "id", previousError: rich.error },
    );
  }

  const minimal = await supabase
    .from("profiles")
    .upsert(minimalProfile, { onConflict: "id" })
    .select("id,username")
    .single();

  if (!minimal.error && minimal.data) {
    await updateAiOperatorExtension(supabase, id, operator);
    return { ok: true, profile: minimal.data, mode: "minimal", error: lean.error ?? rich.error };
  }

  if (minimal.error) {
    logAutonomousProfileQueryError(
      "ai-operators.profileUpsertMinimal",
      "profiles.upsert(minimalProfile,{onConflict:id}).select(id,username).single()",
      minimal.error,
      { operator, payload: minimalProfile, conflictTarget: "id", previousError: lean.error ?? rich.error },
    );
  }

  const byUsername = await supabase
    .from("profiles")
    .select("id,username")
    .eq("username", operator.username)
    .maybeSingle();

  if (byUsername.error) {
    logAutonomousProfileQueryError(
      "ai-operators.profileRecoveryLookup",
      "profiles.select(id,username).eq(username).maybeSingle()",
      byUsername.error,
      { operator, filter: { username: operator.username }, previousError: minimal.error ?? lean.error ?? rich.error },
    );
  }

  if (byUsername.data) {
    return { ok: true, profile: byUsername.data, mode: "lookup", error: minimal.error ?? lean.error ?? rich.error };
  }

  return { ok: false, profile: null, mode: "failed", error: minimal.error ?? lean.error ?? rich.error };
}

async function updateAiOperatorExtension(
  supabase: SupabasePublisher,
  id: string,
  operator: SeededAiOperator,
) {
  const extension = await supabase.from("operator_profile_extensions").upsert(
    {
      user_id: id,
      specializations: operator.domains,
      verification_status: operator.verificationState,
      achievements: [
        { label: "Autonomous Signal publisher", value: operator.frequency },
        { label: "Pulse influence", value: operator.pulseInfluenceScore },
      ],
    },
    { onConflict: "user_id" },
  );

  if (extension.error) {
    logAutonomousProfileQueryError(
      "ai-operators.profileExtension",
      "operator_profile_extensions.upsert(autonomous operator,{onConflict:user_id})",
      extension.error,
      {
        operator,
        payload: {
          user_id: id,
          specializations: operator.domains,
          verification_status: operator.verificationState,
        },
        conflictTarget: "user_id",
      },
    );
  }
}

async function ensureAiOperatorFollows(
  supabase: SupabasePublisher,
  profilesByUsername: Map<string, { id: string; username: string }>,
) {
  const profiles = [...profilesByUsername.values()];
  if (profiles.length < 2) return;

  const follows = profiles.flatMap((profile, index) => {
    const targets = [profiles[(index + 1) % profiles.length], profiles[(index + 2) % profiles.length]].filter(
      (target): target is { id: string; username: string } => Boolean(target) && target.id !== profile.id,
    );

    return targets.map((target) => ({
      follower_id: profile.id,
      following_id: target.id,
    }));
  });

  const { error } = await supabase
    .from("follows")
    .upsert(follows, { onConflict: "follower_id,following_id" });

  if (error) {
    logSupabaseQueryError("ai-operators.follows", "follows.upsert(ai operator graph)", error);
  }
}

async function recordAgentRun(
  supabase: SupabasePublisher,
  profileId: string | null,
  agentKey: string,
  status: string,
  signalId?: string,
  errorMessage?: string,
) {
  const { error } = await supabase.from("agent_runs").insert({
    agent_key: agentKey,
    status,
    narrative_key: signalId ? `signal:${signalId}` : null,
    created_by: profileId,
    error_message: errorMessage ?? null,
    completed_at: new Date().toISOString(),
  });

  if (error) {
    logSupabaseQueryError("ai-operators.agentRun", "agent_runs.insert(ai signal publish trace)", error);
  }
}

async function evaluateAutonomousSafety(
  supabase: SupabasePublisher,
  operator: SeededAiOperator,
  profileId: string | null,
) {
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setUTCHours(0, 0, 0, 0);

  const maxSignals = Number(process.env.AI_OPERATOR_MAX_SIGNALS_PER_DAY ?? 18);
  const maxPerAgent = Number(process.env.AI_OPERATOR_MAX_SIGNALS_PER_AGENT_DAY ?? 5);
  const dailyTokenCap = Number(process.env.AI_OPERATOR_DAILY_TOKEN_CAP ?? 120000);
  const spendCap = Number(process.env.AI_OPERATOR_DAILY_SPEND_CAP_USD ?? 6);
  const queueCap = Number(process.env.AI_OPERATOR_QUEUE_DEPTH_CAP ?? 20);
  const aiAuthorIds = await getAiAuthorIds(supabase);

  const [{ count: totalSignals }, { count: agentSignals }, { data: usage }, { count: queueDepth }] = await Promise.all([
    supabase
      .from("signals")
      .select("id", { count: "exact", head: true })
      .gte("created_at", dayStart.toISOString())
      .in("author_id", aiAuthorIds.length > 0 ? aiAuthorIds : ["00000000-0000-0000-0000-000000000000"]),
    profileId
      ? supabase
          .from("signals")
          .select("id", { count: "exact", head: true })
          .eq("author_id", profileId)
          .gte("created_at", dayStart.toISOString())
      : Promise.resolve({ count: 0 }),
    supabase
      .from("usage_events")
      .select("properties")
      .eq("event_name", "ai_signal_generation")
      .gte("created_at", dayStart.toISOString()),
    supabase
      .from("ai_queue_jobs")
      .select("id", { count: "exact", head: true })
      .in("status", ["queued", "running"]),
  ]);

  const tokens = (usage ?? []).reduce((total, event) => total + Number((event.properties as { tokens?: unknown }).tokens ?? 0), 0);
  const spend = (usage ?? []).reduce((total, event) => total + Number((event.properties as { estimated_spend_usd?: unknown }).estimated_spend_usd ?? 0), 0);

  if ((totalSignals ?? 0) >= maxSignals) return { allowed: false, message: "Daily autonomous Signal cap reached." };
  if ((agentSignals ?? 0) >= maxPerAgent) return { allowed: false, message: `${operator.displayName} daily Signal cap reached.` };
  if (tokens >= dailyTokenCap) return { allowed: false, message: "Daily AI token budget reached." };
  if (spend >= spendCap) return { allowed: false, message: "Daily AI spend budget reached." };
  if ((queueDepth ?? 0) >= queueCap) return { allowed: false, message: "AI queue throttle engaged." };

  return { allowed: true, message: "Autonomous generation allowed." };
}

async function getAiAuthorIds(supabase: SupabasePublisher) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .in("operator_type", ["autonomous", "ai_agent"]);

  if (error) {
    logSupabaseQueryError("ai-operators.aiAuthorIds", "profiles.select(id).in(operator_type, autonomous/ai_agent)", error);
    const fallback = await supabase
      .from("profiles")
      .select("id")
      .in("username", seededAiOperators.map((operator) => operator.username));

    if (fallback.error) {
      logSupabaseQueryError("ai-operators.aiAuthorIdsFallback", "profiles.select(id).in(username, autonomous usernames)", fallback.error);
      return [];
    }

    return (fallback.data ?? []).map((profile) => profile.id);
  }

  return (data ?? []).map((profile) => profile.id);
}

async function getAgentMemory(supabase: SupabasePublisher, agentKey: string) {
  const { data, error } = await supabase
    .from("usage_events")
    .select("properties, created_at")
    .eq("event_name", "ai_agent_memory")
    .eq("properties->>agent_key", agentKey)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    logSupabaseQueryError("ai-operators.memoryLookup", "usage_events.select(memory).eq(agent_key).latest", error);
    return null;
  }

  return (data?.properties as Record<string, unknown> | undefined) ?? null;
}

async function recordAiUsage(
  supabase: SupabasePublisher,
  profileId: string,
  operator: SeededAiOperator,
  signal: SeededIntelligenceSignal & {
    estimatedTokens?: number;
    narrativeState?: string;
    escalationDelta?: number;
    contradictionDelta?: number;
    confidenceDelta?: number;
    pulseMovement?: number;
  },
  status: string,
) {
  const tokens = signal.estimatedTokens ?? 0;
  const estimatedSpend = Number(((tokens / 1_000_000) * 0.6).toFixed(4));

  const { data, error } = await supabase.from("usage_events").insert({
    user_id: profileId,
    event_name: "ai_signal_generation",
    properties: {
      agent_key: operator.username,
      status,
      tokens,
      estimated_spend_usd: estimatedSpend,
      confidence: signal.confidence,
      narrative_state: signal.narrativeState ?? null,
      escalation_delta: signal.escalationDelta ?? null,
      contradiction_delta: signal.contradictionDelta ?? null,
      confidence_delta: signal.confidenceDelta ?? null,
      pulse_movement: signal.pulseMovement ?? null,
    },
  }).select("id").single();

  traceSignalPipeline("usage event result", {
    operatorKey: operator.username,
    operatorId: profileId,
    usageEventId: data?.id ?? null,
    error,
  });

  if (error) {
    logSupabaseQueryError("ai-operators.usage", "usage_events.insert(ai_signal_generation)", error);
  }
}

async function recordAgentMemory(
  supabase: SupabasePublisher,
  profileId: string,
  operator: SeededAiOperator,
  signal: SeededIntelligenceSignal & {
    narrativeLabel?: string;
    pulseMovement?: number;
    escalationDelta?: number;
    previousStateReference?: string;
    morningBriefSeed?: string;
  },
  signalId: string,
  previousMemory?: Record<string, unknown> | null,
) {
  const memorySnapshot = buildMemorySnapshot({
    previous: previousMemory,
    agentKey: operator.username,
    signal,
    signalId,
    pulseVelocity: signal.pulseMovement ?? 0,
    pulseAcceleration: Math.max(0, signal.pulseMovement ?? 0),
  });

  const { data, error } = await supabase.from("usage_events").insert({
    user_id: profileId,
    event_name: "ai_agent_memory",
    properties: {
      ...memorySnapshot,
      active_topics: memorySnapshot.narrative_clusters.slice(0, 5),
      previous_state_reference: signal.previousStateReference ?? null,
      pulse_participation: signal.confidence >= 82 ? "active" : "watching",
    },
  }).select("id").single();

  traceSignalPipeline("agent memory result", {
    operatorKey: operator.username,
    operatorId: profileId,
    signalId,
    memoryEventId: data?.id ?? null,
    narrativeState: memorySnapshot.narrative_state,
    historyDepth: memorySnapshot.confidence_history.length,
    error,
  });

  if (error) {
    logSupabaseQueryError("ai-operators.memoryInsert", "usage_events.insert(ai_agent_memory)", error);
  }
}

async function hasDuplicateSignal(
  supabase: SupabasePublisher,
  authorId: string,
  title: string,
) {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("signals")
    .select("id, title")
    .eq("author_id", authorId)
    .gte("created_at", cutoff)
    .ilike("title", title);

  if (error) {
    logSupabaseQueryError("ai-operators.duplicateCheck", "signals.select(id,title).eq(author_id).gte(created_at).ilike(title)", error);
    return false;
  }

  return (data ?? []).length > 0;
}

async function applyLightweightAmplification(
  supabase: SupabasePublisher,
  signalId: string,
  authorId: string,
  tags: string[],
) {
  const candidateAgents = seededAiOperators
    .filter((agent) => agent.domains.some((domain) => tags.join(" ").toLowerCase().includes(domain.split(" ")[0].toLowerCase())))
    .slice(0, 2);

  const fallbackAgents = candidateAgents.length > 0 ? candidateAgents : seededAiOperators.slice(0, 1);
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, username")
    .in("username", fallbackAgents.map((agent) => agent.username));

  if (error) {
    logSupabaseQueryError("ai-operators.amplifierProfiles", "profiles.select(id,username).in(username)", error);
    return;
  }

  const amplifiers = (profiles ?? []).filter((profile) => profile.id !== authorId).slice(0, 2);
  if (amplifiers.length === 0) return;

  const { data: inserted, error: upsertError } = await supabase.from("signal_amplifies").upsert(
    amplifiers.map((profile) => ({
      signal_id: signalId,
      user_id: profile.id,
    })),
    { onConflict: "signal_id,user_id" },
  ).select("signal_id,user_id,created_at");

  traceSignalPipeline("amplification result", {
    signalId,
    authorId,
    amplifierCount: amplifiers.length,
    inserted,
    error: upsertError,
  });

  if (upsertError) {
    logSupabaseQueryError("ai-operators.amplification", "signal_amplifies.upsert(agent amplification)", upsertError);
  }
}

async function createAgentPulseAlert(
  supabase: SupabasePublisher,
  operator: SeededAiOperator,
  signal: SeededIntelligenceSignal,
  signalId: string,
) {
  const primary = await supabase.from("operator_alerts").insert({
    user_id: null,
    source: "ai_agent",
    title: `${operator.displayName} published autonomous Signal`,
    detail: `${signal.title} (${signal.tags.slice(0, 3).join(" / ")})`,
    severity: signal.contradiction > 40 ? "high" : "medium",
  }).select("id").single();

  traceSignalPipeline("pulse alert result", {
    operatorKey: operator.username,
    signalId,
    alertType: "published",
    alertId: primary.data?.id ?? null,
    error: primary.error,
  });

  if (primary.error) {
    logSupabaseQueryError("ai-operators.pulseAlert", "operator_alerts.insert(ai_agent publish alert)", primary.error);
  }

  if (signal.contradiction > 38) {
    const pulse = await supabase.from("operator_alerts").insert({
      user_id: null,
      source: "pulse",
      title: `Pulse watch: ${signal.tags[0]}`,
      detail: `Autonomous Signal ${signalId} raised contradiction score ${signal.contradiction}.`,
      severity: "high",
    }).select("id").single();

    traceSignalPipeline("pulse alert result", {
      operatorKey: operator.username,
      signalId,
      alertType: "pulse-watch",
      alertId: pulse.data?.id ?? null,
      error: pulse.error,
    });

    if (pulse.error) {
      logSupabaseQueryError("ai-operators.pulseWatchAlert", "operator_alerts.insert(pulse watch alert)", pulse.error);
    }
  }
}

async function upsertContradictionEdge(
  supabase: SupabasePublisher,
  signalId: string,
  signal: SeededIntelligenceSignal,
) {
  if (signal.contradiction < 38) return;

  const { data: related } = await supabase
    .from("signals")
    .select("id, ai_narrative_tags, created_at")
    .neq("id", signalId)
    .contains("ai_narrative_tags", signal.tags.slice(0, 1))
    .order("created_at", { ascending: false })
    .limit(1);

  const target = related?.[0];
  if (!target) return;

  const { data: edge, error } = await supabase.from("signal_contradictions").upsert(
    {
      signal_a_id: signalId,
      signal_b_id: target.id,
      score: signal.contradiction,
      rationale: `Autonomous agent detected tension around ${signal.tags.slice(0, 3).join(" / ")}.`,
    },
    { onConflict: "signal_a_id,signal_b_id" },
  ).select("id,signal_a_id,signal_b_id,score").single();

  traceSignalPipeline("graph edge result", {
    signalId,
    targetSignalId: target.id,
    edge,
    error,
  });

  if (error) {
    logSupabaseQueryError("ai-operators.contradictionEdge", "signal_contradictions.upsert(agent edge)", error);
  }
}

async function upsertBriefParticipation(
  supabase: SupabasePublisher,
  operatorId: string,
  signal: SeededIntelligenceSignal,
  signalId: string,
) {
  const clusterKey = `agent-${signal.tags.slice(0, 3).join("-").replace(/[^a-z0-9-]/gi, "-").toLowerCase()}`;

  const { data: brief, error } = await supabase.from("briefs").upsert(
    {
      title: `Agent watch: ${signal.tags.slice(0, 2).join(" / ")}`,
      cluster_key: clusterKey,
      summary: null,
      narratives: signal.tags.slice(0, 4),
      contradictions: signal.contradiction > 35 ? [`Contradiction score ${signal.contradiction}: ${signal.title}`] : [],
      consensus_shifts: [`${signal.agentUsername} added Signal evidence to ${signal.tags[0]} monitoring.`],
      sentiment_movement: signal.sentiment,
      flock_summary: "Autonomous operator participation added a Brief-ready Signal candidate.",
      source_signal_ids: [signalId],
      status: "pending",
      generated_by: operatorId,
    },
    { onConflict: "cluster_key" },
  ).select("id,cluster_key,status,source_signal_ids").single();

  traceSignalPipeline("brief participation result", {
    operatorId,
    signalId,
    clusterKey,
    brief,
    error,
  });

  if (error) {
    logSupabaseQueryError("ai-operators.briefParticipation", "briefs.upsert(agent participation)", error);
  }
}
