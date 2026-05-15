"use server";

import { revalidatePath } from "next/cache";
import { generateBriefFromCluster } from "@/lib/ai/briefs";
import { getPulseSnapshot } from "@/lib/data/pulse";
import { getViewer } from "@/lib/data/signals";
import { traceAiExecution } from "@/lib/observability";

type BriefActionState = {
  ok: boolean;
  message: string;
};

const rateLimit = new Map<string, number[]>();

function canGenerate(userId: string) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const recent = (rateLimit.get(userId) ?? []).filter((time) => now - time < windowMs);

  if (recent.length >= 4) {
    rateLimit.set(userId, recent);
    return false;
  }

  rateLimit.set(userId, [...recent, now]);
  return true;
}

async function withRetry<T>(operation: () => Promise<T>, attempts = 2): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
    }
  }

  throw lastError;
}

export async function generateBriefAction(
  _state: BriefActionState,
  formData: FormData,
): Promise<BriefActionState> {
  const clusterKey = String(formData.get("clusterKey") ?? "");
  const { supabase, user } = await getViewer();

  if (!supabase || !user) {
    return { ok: false, message: "Log in to generate Briefs." };
  }

  if (!canGenerate(user.id)) {
    return { ok: false, message: "Brief generation is rate limited. Try again shortly." };
  }

  const snapshot = await getPulseSnapshot(40);
  const cluster = snapshot.clusters.find((item) => item.id === clusterKey);

  if (!cluster) {
    return { ok: false, message: "Pulse cluster is no longer available." };
  }

  const existing = await supabase
    .from("briefs")
    .select("id")
    .eq("cluster_key", cluster.id)
    .maybeSingle();

  const sourceSignalIds = cluster.signals.map((signal) => signal.id);

  const pendingPayload = {
    title: cluster.title,
    cluster_key: cluster.id,
    source_signal_ids: sourceSignalIds,
    status: "pending" as const,
    generated_by: user.id,
  };

  const pendingResult = existing.data
    ? await supabase.from("briefs").update(pendingPayload).eq("id", existing.data.id)
    : await supabase.from("briefs").insert(pendingPayload);

  if (pendingResult.error) {
    return {
      ok: false,
      message: "Brief cache table is not ready. Apply the Phase 3 Supabase migration.",
    };
  }

  try {
    const brief = await withRetry(
      () => traceAiExecution("brief.generate", () => generateBriefFromCluster(cluster), {
        cluster: cluster.id,
        user: user.id,
      }),
      2,
    );
    const result = await supabase
      .from("briefs")
      .update({
        summary: brief.summary,
        narratives: brief.narratives,
        contradictions: brief.contradictions,
        consensus_shifts: brief.consensus_shifts,
        sentiment_movement: brief.sentiment_movement,
        flock_summary: brief.flock_summary,
        status: "ready",
        error_message: null,
        generated_at: new Date().toISOString(),
      })
      .eq("cluster_key", cluster.id);

    if (result.error) {
      return { ok: false, message: result.error.message };
    }

    revalidatePath("/briefs");
    revalidatePath(`/briefs/${cluster.id}`);
    return { ok: true, message: "Brief generated." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Brief generation failed.";
    await supabase
      .from("briefs")
      .update({ status: "failed", error_message: message })
      .eq("cluster_key", cluster.id);

    revalidatePath("/briefs");
    return { ok: false, message };
  }
}
