"use server";

import { revalidatePath } from "next/cache";
import { generateBriefFromCluster } from "@/lib/ai/briefs";
import { getViewer } from "@/lib/data/signals";
import { getNarrativeSystem } from "@/lib/narratives";
import { ensureAutonomousOperators, insertGuaranteedAutonomousTestSignal } from "@/lib/seeded-ai-activity";

type AgentActionState = {
  ok: boolean;
  message: string;
};

const rateLimit = new Map<string, number[]>();
let activeSweep = false;

function canRun(userId: string) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const recent = (rateLimit.get(userId) ?? []).filter((time) => now - time < windowMs);

  if (recent.length >= 2) {
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
      await new Promise((resolve) => setTimeout(resolve, 450 * (attempt + 1)));
    }
  }

  throw lastError;
}

export async function runAutonomousBriefSweepAction(
  _state: AgentActionState,
  _formData: FormData,
): Promise<AgentActionState> {
  void _state;
  void _formData;

  const { supabase, user } = await getViewer();

  if (!supabase || !user) {
    return { ok: false, message: "Log in to run autonomous brief generation." };
  }

  if (!process.env.OPENAI_API_KEY) {
    return { ok: false, message: "OPENAI_API_KEY is not configured. No autonomous AI output was generated." };
  }

  if (!canRun(user.id)) {
    return { ok: false, message: "Autonomous generation is rate limited. Try again shortly." };
  }

  if (activeSweep) {
    return { ok: false, message: "An autonomous generation sweep is already running." };
  }

  activeSweep = true;

  try {
    await ensureAutonomousOperators();
    const signalResult = await insertGuaranteedAutonomousTestSignal("run-autonomous-sweep-button", user.id, supabase);
    revalidatePath("/feed");
    revalidatePath("/pulse");
    revalidatePath("/graph");
    revalidatePath("/operators");
    revalidatePath("/ops");

    if (!signalResult.ok) {
      return {
        ok: false,
        message: signalResult.message,
      };
    }

    const narratives = await getNarrativeSystem();
    const candidate = narratives
      .filter((narrative) => narrative.predictions.pulse_formation_probability >= 45)
      .sort((a, b) => b.predictions.acceleration_probability - a.predictions.acceleration_probability)[0];

    if (!candidate) {
      return {
        ok: true,
        message: `Autonomous test Signal inserted (${signalResult.signalId}). No narrative currently clears the Brief threshold.`,
      };
    }

    const existing = await supabase
      .from("briefs")
      .select("id")
      .eq("cluster_key", candidate.cluster.id)
      .maybeSingle();

    const pendingPayload = {
      title: candidate.title,
      cluster_key: candidate.cluster.id,
      source_signal_ids: candidate.cluster.signals.map((signal) => signal.id),
      status: "pending" as const,
      generated_by: user.id,
    };

    const pendingResult = existing.data
      ? await supabase.from("briefs").update(pendingPayload).eq("id", existing.data.id)
      : await supabase.from("briefs").insert(pendingPayload);

    if (pendingResult.error) {
      return { ok: false, message: "Brief cache table is not ready for autonomous generation." };
    }

    const brief = await withRetry(() => generateBriefFromCluster(candidate.cluster), 2);
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
      .eq("cluster_key", candidate.cluster.id);

    if (result.error) {
      return { ok: false, message: result.error.message };
    }

    revalidatePath("/agents");
    revalidatePath("/briefs");
    revalidatePath(`/narratives/${candidate.id}`);
    return {
      ok: true,
      message: `Autonomous Signal inserted (${signalResult.signalId}) and Brief generated for ${candidate.title}.`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Autonomous generation failed.";
    return { ok: false, message };
  } finally {
    activeSweep = false;
  }
}
