import { createAdminClient } from "@/lib/supabase/admin";
import { getPulseSnapshot } from "@/lib/data/pulse";
import { buildNarrativeRecord, type NarrativeRecord } from "@/lib/narratives";
import { logSupabaseQueryError, logSupabaseQueryException } from "@/lib/supabase/errors";
import type { PulseCluster } from "@/lib/pulse";
import type { Database } from "@/lib/supabase/types";

export type NarrativeEscalationLevel = "watch" | "rising" | "critical";

export type NarrativeEscalation = {
  id: string;
  clusterId: string;
  title: string;
  summary: string;
  level: NarrativeEscalationLevel;
  score: number;
  confidence: number;
  acceleration: number;
  fragmentation: number;
  volatility: number;
  operatorDensity: number;
  pulseFormation: number;
  signalIds: string[];
  evidence: string[];
  recommendedAction: string;
  createdAt: string;
};

export type NarrativeEscalationSnapshot = {
  escalations: NarrativeEscalation[];
  processedClusters: number;
  topScore: number;
  updatedAt: string;
};

const ALERT_DEDUP_WINDOW_HOURS = 12;

export async function getNarrativeEscalationSnapshot(limit = 8): Promise<NarrativeEscalationSnapshot> {
  const pulse = await getPulseSnapshot(64);
  const escalations = pulse.clusters
    .slice(0, Math.max(limit * 2, limit))
    .map((cluster) => evaluateNarrativeEscalation(cluster))
    .filter((escalation): escalation is NarrativeEscalation => Boolean(escalation))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return {
    escalations,
    processedClusters: pulse.clusters.length,
    topScore: escalations[0]?.score ?? 0,
    updatedAt: new Date().toISOString(),
  };
}

export async function processNarrativeEscalations() {
  const snapshot = await getNarrativeEscalationSnapshot(6);
  const actionable = snapshot.escalations.filter((escalation) => escalation.level !== "watch");

  if (actionable.length === 0) {
    return {
      ok: true,
      skipped: true,
      processed: snapshot.processedClusters,
      escalations: 0,
      message: "No narrative escalation crossed the V1 threshold.",
    };
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return {
      ok: true,
      degraded: true,
      processed: snapshot.processedClusters,
      escalations: actionable.length,
      topEscalation: actionable[0],
      message: "Narrative escalation detected; service-role client is unavailable, so no operator alert was persisted.",
    };
  }

  const persisted = [];
  for (const escalation of actionable.slice(0, Number(process.env.NARRATIVE_ESCALATION_MAX_ALERTS ?? 3))) {
    const result = await persistNarrativeEscalationAlert(supabase, escalation);
    persisted.push(result);
  }

  const inserted = persisted.filter((item) => item.inserted).length;
  return {
    ok: true,
    processed: snapshot.processedClusters,
    escalations: actionable.length,
    inserted,
    deduped: persisted.length - inserted,
    topEscalation: actionable[0],
    message: inserted > 0
      ? `${inserted} narrative escalation alert${inserted === 1 ? "" : "s"} persisted.`
      : "Narrative escalations detected; recent matching alerts already exist.",
  };
}

export function evaluateNarrativeEscalation(cluster: PulseCluster): NarrativeEscalation | null {
  const record = buildNarrativeRecord(cluster, []);
  const score = scoreNarrativeEscalation(record);

  if (score < Number(process.env.NARRATIVE_ESCALATION_MIN_SCORE ?? 42)) {
    return null;
  }

  const level: NarrativeEscalationLevel = score >= 78 ? "critical" : score >= 58 ? "rising" : "watch";
  const evidence = buildEscalationEvidence(record);

  return {
    id: `narrative-escalation:${cluster.id}`,
    clusterId: cluster.id,
    title: record.title,
    summary: record.summary,
    level,
    score,
    confidence: record.confidence_score,
    acceleration: record.acceleration_score,
    fragmentation: record.fragmentation_score,
    volatility: record.volatility_score,
    operatorDensity: record.operator_density_score,
    pulseFormation: record.predictions.pulse_formation_probability,
    signalIds: cluster.signals.map((signal) => signal.id),
    evidence,
    recommendedAction: getRecommendedAction(level, record),
    createdAt: new Date().toISOString(),
  };
}

function scoreNarrativeEscalation(record: NarrativeRecord) {
  const contradictionWeight = Math.min(100, record.contradictions.reduce((max, item) => Math.max(max, item.score), 0));
  const linkedBriefWeight = record.linked_briefs.length > 0 ? 8 : 0;
  return Math.min(
    100,
    Math.round(
      record.acceleration_score * 0.24 +
        record.fragmentation_score * 0.18 +
        record.volatility_score * 0.18 +
        record.operator_density_score * 0.16 +
        record.predictions.pulse_formation_probability * 0.16 +
        contradictionWeight * 0.08 +
        linkedBriefWeight,
    ),
  );
}

function buildEscalationEvidence(record: NarrativeRecord) {
  const evidence = [
    `${record.cluster.signals.length} Signal${record.cluster.signals.length === 1 ? "" : "s"} in cluster`,
    `${record.cluster.flock_count} Flock surface${record.cluster.flock_count === 1 ? "" : "s"}`,
    `${record.operator_density_score}% operator density`,
    `${record.predictions.pulse_formation_probability}% Pulse formation probability`,
  ];

  if (record.contradictions.length > 0) {
    evidence.push(`${record.contradictions.length} contradiction edge${record.contradictions.length === 1 ? "" : "s"}`);
  }

  return evidence;
}

function getRecommendedAction(level: NarrativeEscalationLevel, record: NarrativeRecord) {
  if (level === "critical") {
    return `Escalate ${record.title} to Brief generation and monitor contradiction edges before further autonomous amplification.`;
  }

  if (level === "rising") {
    return `Keep ${record.title} on active watch and wait for one more corroborating Signal before synthesis.`;
  }

  return `Track ${record.title} as a watch narrative; no operator intervention required yet.`;
}

async function persistNarrativeEscalationAlert(
  supabase: NonNullable<ReturnType<typeof createAdminClient>>,
  escalation: NarrativeEscalation,
) {
  const title = `Narrative ${escalation.level}: ${escalation.title}`;
  const cutoff = new Date(Date.now() - ALERT_DEDUP_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  const existing = await supabase
    .from("operator_alerts")
    .select("id, created_at")
    .eq("source", "narrative-escalation")
    .eq("title", title)
    .gte("created_at", cutoff)
    .limit(1);

  if (existing.error) {
    logSupabaseQueryError(
      "narrativeEscalation.alertLookup",
      "operator_alerts.select(id,created_at).eq(source,title).gte(created_at)",
      existing.error,
    );
  }

  if ((existing.data ?? []).length > 0) {
    return { inserted: false, alertId: existing.data?.[0]?.id ?? null, escalation };
  }

  const payload: Database["public"]["Tables"]["operator_alerts"]["Insert"] = {
    source: "narrative-escalation",
    title,
    detail: `${escalation.summary} ${escalation.recommendedAction}`,
    severity: escalation.level === "critical" ? "high" : escalation.level === "rising" ? "medium" : "low",
  };

  try {
    const inserted = await supabase
      .from("operator_alerts")
      .insert(payload)
      .select("id")
      .single();

    if (inserted.error) {
      logSupabaseQueryError(
        "narrativeEscalation.alertInsert",
        "operator_alerts.insert(narrative escalation alert).select(id).single()",
        inserted.error,
      );
      return { inserted: false, alertId: null, escalation };
    }

    return { inserted: true, alertId: inserted.data.id, escalation };
  } catch (error) {
    logSupabaseQueryException("narrativeEscalation.alertInsert", "operator_alerts.insert(narrative escalation alert)", error);
    return { inserted: false, alertId: null, escalation };
  }
}
