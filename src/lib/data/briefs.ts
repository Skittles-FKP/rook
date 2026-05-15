import { getPulseSnapshot } from "@/lib/data/pulse";
import { getViewer } from "@/lib/data/signals";
import { logSupabaseQueryError, logSupabaseQueryException } from "@/lib/supabase/errors";
import type { Brief } from "@/lib/supabase/types";

export type BriefCandidate = {
  cluster_key: string;
  title: string;
  pulse_score: number;
  signal_count: number;
  source_signal_ids: string[];
};

export type BriefWithCandidate = Brief & {
  candidate?: BriefCandidate;
};

export async function getBriefCandidates(): Promise<BriefCandidate[]> {
  const snapshot = await getPulseSnapshot(40);

  return snapshot.clusters.slice(0, 8).map((cluster) => ({
    cluster_key: cluster.id,
    title: cluster.title,
    pulse_score: cluster.pulse_score,
    signal_count: cluster.signals.length,
    source_signal_ids: cluster.signals.map((signal) => signal.id),
  }));
}

export async function getBriefs(precomputedCandidates?: BriefCandidate[]): Promise<BriefWithCandidate[]> {
  const { supabase } = await getViewer();
  const candidates = precomputedCandidates ?? await getBriefCandidates();

  if (!supabase) {
    return candidates.map(candidateToPendingBrief);
  }

  const { data, error } = await supabase
    .from("briefs")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(20);

  if (error || !data) {
    if (error) {
      logSupabaseQueryError("getBriefs", "briefs.select(*).order(updated_at desc).limit(20)", error);
    }
    return candidates.map(candidateToPendingBrief);
  }

  const byCluster = new Map(candidates.map((candidate) => [candidate.cluster_key, candidate]));
  const briefs = (data as Brief[]).map((brief) => ({
    ...brief,
    candidate: byCluster.get(brief.cluster_key),
  }));
  const generatedKeys = new Set(briefs.map((brief) => brief.cluster_key));
  const pending = candidates
    .filter((candidate) => !generatedKeys.has(candidate.cluster_key))
    .map(candidateToPendingBrief);

  return [...briefs, ...pending];
}

export async function getBriefById(id: string): Promise<BriefWithCandidate | null> {
  const { supabase } = await getViewer();
  const candidates = await getBriefCandidates();
  const candidate = candidates.find((item) => item.cluster_key === id);

  if (!supabase) {
    return candidate ? candidateToPendingBrief(candidate) : null;
  }

  const { data, error } = await supabase.from("briefs").select("*").eq("id", id).maybeSingle();

  if (!error && data) {
    return {
      ...(data as Brief),
      candidate: candidates.find((item) => item.cluster_key === (data as Brief).cluster_key),
    };
  }

  if (error) {
    logSupabaseQueryError("getBriefById.id", "briefs.select(*).eq(id).maybeSingle()", error);
  }

  let byCluster: unknown = null;
  try {
    const byClusterResult = await supabase
      .from("briefs")
      .select("*")
      .eq("cluster_key", id)
      .maybeSingle();
    byCluster = byClusterResult.data;
    if (byClusterResult.error) {
      logSupabaseQueryError("getBriefById.cluster", "briefs.select(*).eq(cluster_key).maybeSingle()", byClusterResult.error);
    }
  } catch (exception) {
    logSupabaseQueryException("getBriefById.cluster", "briefs.select(*).eq(cluster_key).maybeSingle()", exception);
  }

  if (byCluster) {
    return {
      ...(byCluster as Brief),
      candidate: candidates.find((item) => item.cluster_key === (byCluster as Brief).cluster_key),
    };
  }

  return candidate ? candidateToPendingBrief(candidate) : null;
}

function candidateToPendingBrief(candidate: BriefCandidate): BriefWithCandidate {
  const now = new Date().toISOString();

  return {
    id: candidate.cluster_key,
    title: candidate.title,
    cluster_key: candidate.cluster_key,
    summary: null,
    narratives: [],
    contradictions: [],
    consensus_shifts: [],
    sentiment_movement: null,
    flock_summary: null,
    source_signal_ids: candidate.source_signal_ids,
    status: "pending",
    error_message: null,
    generated_by: null,
    generated_at: null,
    created_at: now,
    updated_at: now,
    candidate,
  };
}
