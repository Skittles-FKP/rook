import { createAdminClient } from "@/lib/supabase/admin";
import { seededAiOperators } from "@/lib/seeded-ai-activity";
import { logSupabaseQueryError, logSupabaseQueryException } from "@/lib/supabase/errors";

export type AiOperatorMetrics = {
  spendToday: number;
  tokenUsageToday: number;
  activeAgents: number;
  queueDepth: number;
  generationFailures: number;
  sweepCadence: string;
  autonomousSignalsToday: number;
  dailySignalCap: number;
  cooldownStatus: string;
  latestAutonomousSweep: string | null;
};

export async function getAiOperatorMetrics(): Promise<AiOperatorMetrics> {
  const supabase = createAdminClient();
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);

  const fallback: AiOperatorMetrics = {
    spendToday: 0,
    tokenUsageToday: 0,
    activeAgents: seededAiOperators.length,
    queueDepth: 0,
    generationFailures: 0,
    sweepCadence: `${Math.min(...seededAiOperators.map((agent) => agent.cadenceMinutes))} min min cadence`,
    autonomousSignalsToday: 0,
    dailySignalCap: Number(process.env.AI_OPERATOR_MAX_SIGNALS_PER_DAY ?? 18),
    cooldownStatus: "ready",
    latestAutonomousSweep: null,
  };

  if (!supabase) return fallback;

  try {
    const [{ data: usage, error: usageError }, { count: queueDepth, error: queueError }, { count: failures, error: failureError }, { count: activeAgents, error: agentError }, { data: latestRun, error: latestRunError }] =
      await Promise.all([
        supabase
          .from("usage_events")
          .select("properties")
          .eq("event_name", "ai_signal_generation")
          .gte("created_at", dayStart.toISOString()),
        supabase
          .from("ai_queue_jobs")
          .select("id", { count: "exact", head: true })
          .in("status", ["queued", "running"]),
        supabase
          .from("agent_runs")
          .select("id", { count: "exact", head: true })
          .eq("status", "failed")
          .gte("created_at", dayStart.toISOString()),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("operator_type", "ai_agent")
          .neq("autonomous_status", "quiet"),
        supabase
          .from("agent_runs")
          .select("created_at, status")
          .in("agent_key", seededAiOperators.map((operator) => operator.username))
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

    if (usageError) logSupabaseQueryError("aiOperatorMetrics.usage", "usage_events.select(ai_signal_generation today)", usageError);
    if (queueError) logSupabaseQueryError("aiOperatorMetrics.queue", "ai_queue_jobs.count(active)", queueError);
    if (failureError) logSupabaseQueryError("aiOperatorMetrics.failures", "agent_runs.count(failed today)", failureError);
    if (agentError) logSupabaseQueryError("aiOperatorMetrics.activeAgents", "profiles.count(ai agents active)", agentError);
    if (latestRunError) logSupabaseQueryError("aiOperatorMetrics.latestRun", "agent_runs.select(created_at,status).in(agent_key).order(created_at desc)", latestRunError);

    const tokenUsageToday = (usage ?? []).reduce(
      (total, event) => total + Number((event.properties as { tokens?: unknown }).tokens ?? 0),
      0,
    );
    const spendToday = (usage ?? []).reduce(
      (total, event) => total + Number((event.properties as { estimated_spend_usd?: unknown }).estimated_spend_usd ?? 0),
      0,
    );

    return {
      ...fallback,
      spendToday: Number(spendToday.toFixed(4)),
      tokenUsageToday,
      activeAgents: activeAgents ?? fallback.activeAgents,
      queueDepth: queueDepth ?? 0,
      generationFailures: failures ?? 0,
      autonomousSignalsToday: usage?.filter((event) => (event.properties as { status?: unknown }).status === "completed").length ?? 0,
      latestAutonomousSweep: latestRun?.[0]?.created_at ?? null,
      cooldownStatus: deriveCooldownStatus(latestRun?.[0]?.created_at ?? null),
    };
  } catch (error) {
    logSupabaseQueryException("aiOperatorMetrics", "aggregate AI operator operational metrics", error);
    return fallback;
  }
}

function deriveCooldownStatus(latestRun: string | null) {
  const cooldownMinutes = Number(process.env.AI_OPERATOR_SIGNAL_COOLDOWN_MINUTES ?? 45);
  if (!latestRun || cooldownMinutes <= 0) return "ready";

  const elapsedMinutes = (Date.now() - new Date(latestRun).getTime()) / (1000 * 60);
  if (elapsedMinutes >= cooldownMinutes) return "ready";
  return `${Math.ceil(cooldownMinutes - elapsedMinutes)}m cooldown`;
}
