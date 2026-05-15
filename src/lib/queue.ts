import { generateBriefFromCluster } from "@/lib/ai/briefs";
import { getBriefs } from "@/lib/data/briefs";
import { getPulseSnapshot } from "@/lib/data/pulse";
import { getNarrativeEscalationSnapshot, processNarrativeEscalations } from "@/lib/narrative-escalation";
import { traceAiExecution } from "@/lib/observability";

export type AiQueueJobKind = "brief_generation" | "narrative_analysis" | "external_ingest" | "quality_scan";

export type AiQueueJob = {
  id: string;
  kind: AiQueueJobKind;
  target: string;
  status: "queued" | "running" | "completed" | "failed" | "degraded";
  attempts: number;
  max_attempts: number;
  priority: number;
  detail: string;
  created_at: string;
};

export async function getAiQueueSnapshot(): Promise<AiQueueJob[]> {
  const [, briefs, escalation] = await Promise.all([
    getPulseSnapshot(48),
    getBriefs(),
    getNarrativeEscalationSnapshot(4),
  ]);
  const pendingBriefs = briefs.filter((brief) => brief.status !== "ready");
  const now = Date.now();

  return [
    ...pendingBriefs.slice(0, 6).map((brief, index): AiQueueJob => ({
      id: `brief:${brief.cluster_key}`,
      kind: "brief_generation",
      target: brief.title,
      status: process.env.OPENAI_API_KEY ? "queued" : "degraded",
      attempts: brief.status === "failed" ? 1 : 0,
      max_attempts: 3,
      priority: Math.max(1, Math.round((brief.candidate?.pulse_score ?? 20) / 12)),
      detail: process.env.OPENAI_API_KEY ? "Ready for background worker" : "AI provider missing; job held safely",
      created_at: new Date(now - index * 7 * 60 * 1000).toISOString(),
    })),
    ...escalation.escalations.slice(0, 4).map((item, index): AiQueueJob => ({
      id: `narrative:${item.clusterId}`,
      kind: "narrative_analysis",
      target: item.title,
      status: item.level === "watch" ? "queued" : "running",
      attempts: 0,
      max_attempts: 2,
      priority: Math.max(1, Math.round(item.score / 12)),
      detail: `${item.level} escalation · score ${item.score} · ${item.recommendedAction}`,
      created_at: new Date(now - (index + 6) * 7 * 60 * 1000).toISOString(),
    })),
  ].sort((a, b) => b.priority - a.priority);
}

export async function processNextBriefJob() {
  const escalation = await processNarrativeEscalations();
  if (escalation.escalations > 0) {
    return escalation;
  }

  if (!process.env.OPENAI_API_KEY) {
    return { ok: false, message: "OPENAI_API_KEY is not configured. Queue remains degraded." };
  }

  const pulse = await getPulseSnapshot(48);
  const cluster = pulse.clusters.sort((a, b) => b.pulse_score - a.pulse_score)[0];

  if (!cluster) {
    return { ok: false, message: "No Pulse cluster available for background processing." };
  }

  await traceAiExecution("queue.brief_generation", () => generateBriefFromCluster(cluster), {
    cluster: cluster.id,
    signals: cluster.signals.length,
  });

  return { ok: true, message: `Processed queued Brief candidate for ${cluster.title}.` };
}
