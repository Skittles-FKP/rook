import { getFeedSignals } from "@/lib/data/signals";
import { seededAiOperators } from "@/lib/seeded-ai-activity";
import { createAdminClient } from "@/lib/supabase/admin";
import { logSupabaseQueryError, logSupabaseQueryException } from "@/lib/supabase/errors";

export type AutonomousDebugMetrics = {
  serviceRoleReady: boolean;
  autonomousSignalsInserted: number;
  activeAgents: number;
  failedInserts: number;
  feedQueryCount: number;
  latestAiSignalTimestamp: string | null;
  latestAiSignalIds: string[];
  feedSignalIds: string[];
  errors: string[];
  checkedAt: string;
};

export async function getAutonomousDebugMetrics(): Promise<AutonomousDebugMetrics> {
  const errors: string[] = [];
  const feed = await getFeedSignals(40).catch((error) => {
    logSupabaseQueryException("ops-debug.feed", "getFeedSignals(40)", error);
    errors.push(error instanceof Error ? error.message : String(error));
    return [];
  });
  const feedSignalIds = feed.map((signal) => signal.id);
  const admin = createAdminClient();

  if (!admin) {
    return {
      serviceRoleReady: false,
      autonomousSignalsInserted: feed.filter((signal) => isAutonomousAuthor(signal.author?.operator_type)).length,
      activeAgents: feed.filter((signal) => isAutonomousAuthor(signal.author?.operator_type)).length,
      failedInserts: 0,
      feedQueryCount: feed.length,
      latestAiSignalTimestamp: feed.find((signal) => isAutonomousAuthor(signal.author?.operator_type))?.created_at ?? null,
      latestAiSignalIds: feed.filter((signal) => isAutonomousAuthor(signal.author?.operator_type)).slice(0, 8).map((signal) => signal.id),
      feedSignalIds,
      errors: [...errors, "SUPABASE_SERVICE_ROLE_KEY is not configured."],
      checkedAt: new Date().toISOString(),
    };
  }

  const aiProfiles = await getAiProfiles(admin, errors);
  const aiProfileIds = aiProfiles.map((profile) => profile.id);
  const aiSignals = await getAiSignals(admin, aiProfileIds, errors);
  const failedInserts = await getFailedInsertCount(admin, errors);

  return {
    serviceRoleReady: true,
    autonomousSignalsInserted: aiSignals.length,
    activeAgents: aiProfiles.length,
    failedInserts,
    feedQueryCount: feed.length,
    latestAiSignalTimestamp: aiSignals[0]?.created_at ?? null,
    latestAiSignalIds: aiSignals.slice(0, 8).map((signal) => signal.id),
    feedSignalIds,
    errors,
    checkedAt: new Date().toISOString(),
  };
}

async function getAiProfiles(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  errors: string[],
) {
  const usernames = seededAiOperators.map((operator) => operator.username);

  try {
    const rich = await admin
      .from("profiles")
      .select("id, username, operator_type, autonomous_status")
      .in("operator_type", ["autonomous", "ai_agent"]);

    if (!rich.error) return rich.data ?? [];

    logSupabaseQueryError("ops-debug.aiProfiles", "profiles.select(id,username,operator_type,autonomous_status).in(operator_type,autonomous/ai_agent)", rich.error);
    errors.push(`AI profile rich query failed: ${rich.error.message}`);
  } catch (error) {
    logSupabaseQueryException("ops-debug.aiProfiles", "profiles rich AI operator query", error);
    errors.push(error instanceof Error ? error.message : String(error));
  }

  const lean = await admin
    .from("profiles")
    .select("id, username")
    .in("username", usernames);

  if (lean.error) {
    logSupabaseQueryError("ops-debug.aiProfilesLean", "profiles.select(id,username).in(username,seeded)", lean.error);
    errors.push(`AI profile lean query failed: ${lean.error.message}`);
    return [];
  }

  return lean.data ?? [];
}

function isAutonomousAuthor(operatorType: string | null | undefined) {
  return operatorType === "autonomous" || operatorType === "ai_agent";
}

async function getAiSignals(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  aiProfileIds: string[],
  errors: string[],
) {
  if (aiProfileIds.length === 0) return [];

  const result = await admin
    .from("signals")
    .select("id, title, author_id, created_at")
    .in("author_id", aiProfileIds)
    .order("created_at", { ascending: false })
    .limit(100);

  if (result.error) {
    logSupabaseQueryError("ops-debug.aiSignals", "signals.select(id,title,author_id,created_at).in(author_id,ai ids).order(created_at desc)", result.error);
    errors.push(`AI signals query failed: ${result.error.message}`);
    return [];
  }

  return result.data ?? [];
}

async function getFailedInsertCount(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  errors: string[],
) {
  const result = await admin
    .from("agent_runs")
    .select("id, status, error_message")
    .not("error_message", "is", null)
    .limit(100);

  if (result.error) {
    logSupabaseQueryError("ops-debug.failedInserts", "agent_runs.select(id,status,error_message).not(error_message,is,null)", result.error);
    errors.push(`failed insert query failed: ${result.error.message}`);
    return 0;
  }

  return result.data?.length ?? 0;
}
