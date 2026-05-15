import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { validateFeedReadiness } from "@/lib/supabase/feed-health";

export const runtime = "nodejs";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        message: "Supabase is not configured.",
        checkedAt: new Date().toISOString(),
      },
      { status: 503 },
    );
  }

  try {
    const supabase = await createClient();
    const [report, pipeline] = await Promise.all([
      validateFeedReadiness(supabase),
      getSignalPipelineDiagnostics(),
    ]);

    return NextResponse.json(
      {
        ...report,
        pipeline,
        checkedAt: new Date().toISOString(),
      },
      { status: report.ok ? 200 : 503 },
    );
  } catch (error) {
    console.error("[supabase:feed-health] validation exception", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Supabase feed validation failed.",
        checkedAt: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}

async function getSignalPipelineDiagnostics() {
  const admin = createAdminClient();

  if (!admin) {
    return {
      serviceRoleConfigured: false,
      message: "SUPABASE_SERVICE_ROLE_KEY is not configured; insert verification can only run in deployed/server environments with service role access.",
    };
  }

  const [latestSignals, aiOperators, aiSignals] = await Promise.allSettled([
    admin
      .from("signals")
      .select("*, author:profiles!signals_author_id_fkey(id,username,display_name,operator_type,autonomous_status), flock:flocks(id,name,slug)")
      .order("created_at", { ascending: false })
      .limit(10),
    admin
      .from("profiles")
      .select("id,username,display_name,operator_type,autonomous_status,source_domains_monitored,signal_frequency")
      .in("operator_type", ["autonomous", "ai_agent"])
      .order("username", { ascending: true }),
    admin
      .from("signals")
      .select("id,title,author_id,created_at,confidence_score,ai_narrative_tags")
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const operatorIds = aiOperators.status === "fulfilled" && !aiOperators.value.error
    ? new Set((aiOperators.value.data ?? []).map((operator) => operator.id))
    : new Set<string>();
  const recentAiSignals = aiSignals.status === "fulfilled" && !aiSignals.value.error
    ? (aiSignals.value.data ?? []).filter((signal) => operatorIds.has(signal.author_id))
    : [];

  return {
    serviceRoleConfigured: true,
    latestSignals: summarizeHealthResult(latestSignals),
    aiOperators: summarizeHealthResult(aiOperators),
    recentAiSignals: {
      count: recentAiSignals.length,
      rows: recentAiSignals.slice(0, 10),
      source: summarizeHealthResult(aiSignals),
    },
  };
}

function summarizeHealthResult<T extends { data?: unknown; error?: unknown }>(
  result: PromiseSettledResult<T>,
) {
  if (result.status === "rejected") {
    return { status: "rejected", error: String(result.reason), count: 0, rows: [] };
  }

  const data = result.value.data;
  return {
    status: result.value.error ? "error" : "ok",
    error: result.value.error ?? null,
    count: Array.isArray(data) ? data.length : data ? 1 : 0,
    rows: data,
  };
}
