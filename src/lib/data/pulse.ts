import { getFeedSignals, getViewer } from "@/lib/data/signals";
import { clusterPulseSignals, scorePulseSignal, type PulseCluster, type PulseSignal } from "@/lib/pulse";
import { logSupabaseQueryError, logSupabaseQueryException } from "@/lib/supabase/errors";
import { validateFeedReadiness } from "@/lib/supabase/feed-health";

export type PulseSnapshot = {
  signals: PulseSignal[];
  clusters: PulseCluster[];
  events: NetworkEvent[];
  updatedAt: string;
};

export type NetworkEvent = {
  id: string;
  type: "signal" | "amplify" | "comment" | "pulse" | "brief" | "like" | "follow" | "alert";
  label: string;
  detail: string;
  created_at: string;
};

export async function getPulseSnapshot(limit = 40): Promise<PulseSnapshot> {
  try {
    const feedResult = await Promise.resolve(getFeedSignals(limit));
    const signals = feedResult.map(scorePulseSignal);
    const clusters = safeClusterPulseSignals(signals);
    const events = await getNetworkEvents(signals);
    console.info("[pulse:pipeline] snapshot", {
      requestedLimit: limit,
      signalCount: signals.length,
      clusterCount: clusters.length,
      eventCount: events.length,
      topSignalIds: signals.slice(0, 5).map((signal) => signal.id),
    });

    return {
      signals: signals.sort((a, b) => b.pulse_score - a.pulse_score),
      clusters,
      events,
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    logSupabaseQueryException("getPulseSnapshot", "getFeedSignals -> scorePulseSignal -> clusterPulseSignals -> getNetworkEvents", error);
    return emptyPulseSnapshot();
  }
}

export async function getNetworkEvents(seedSignals?: PulseSignal[]): Promise<NetworkEvent[]> {
  const { supabase } = await getViewer();
  const events: NetworkEvent[] = [];

  if (!supabase) {
    return events;
  }

  const signals = seedSignals ?? await getNetworkEventSignals();
  console.info("[pulse:pipeline] network seed", {
    providedSeedSignals: Boolean(seedSignals),
    signalCount: signals.length,
  });

  events.push(
    ...signals.slice(0, 6).map((signal) => ({
      id: `signal-${signal.id}`,
      type: signal.pulse_score > 36 ? "pulse" as const : "signal" as const,
      label: signal.pulse_score > 36 ? "Pulse forming" : "Signal published",
      detail: signal.flock ? `${signal.title} in ${signal.flock.name}` : signal.title,
      created_at: signal.created_at,
    })),
  );

  const [amplifiesResult, commentsResult] = await Promise.allSettled([
    supabase
      .from("signal_amplifies")
      .select("signal_id, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("comments")
      .select("signal_id, created_at, body")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const amplifies = unwrapPulseEventQuery(
    "getNetworkEvents.amplifies",
    "signal_amplifies.select(signal_id, created_at).order(created_at desc).limit(8)",
    amplifiesResult,
  );
  const comments = unwrapPulseEventQuery(
    "getNetworkEvents.comments",
    "comments.select(signal_id, created_at, body).order(created_at desc).limit(8)",
    commentsResult,
  );

  const signalTitles = new Map(signals.map((signal) => [signal.id, signal.title]));
  console.info("[pulse:pipeline] interaction sources", {
    signalCount: signals.length,
    amplifyCount: amplifies.length,
    commentCount: comments.length,
  });

  events.push(
    ...amplifies.map((item) => ({
      id: `amplify-${item.signal_id}-${item.created_at}`,
      type: "amplify" as const,
      label: "Operator amplified Signal",
      detail: signalTitles.get(item.signal_id) ?? "Signal amplification detected",
      created_at: item.created_at,
    })),
    ...comments.map((item) => ({
      id: `comment-${item.signal_id}-${item.created_at}`,
      type: "comment" as const,
      label: "Flock activity detected",
      detail: signalTitles.get(item.signal_id) ?? "Comment velocity changed",
      created_at: item.created_at,
    })),
  );

  return events
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 12);
}

function emptyPulseSnapshot(): PulseSnapshot {
  return {
    signals: [],
    clusters: [],
    events: [],
    updatedAt: new Date().toISOString(),
  };
}

function safeClusterPulseSignals(signals: PulseSignal[]) {
  try {
    return clusterPulseSignals(signals);
  } catch (error) {
    logSupabaseQueryException("getPulseSnapshot.cluster", "clusterPulseSignals(signals)", error);
    return [];
  }
}

async function getNetworkEventSignals() {
  try {
    return (await getFeedSignals(12)).map(scorePulseSignal);
  } catch (error) {
    logSupabaseQueryException("getNetworkEvents.feedSignals", "getFeedSignals(12).map(scorePulseSignal)", error);
    return [];
  }
}

function unwrapPulseEventQuery<T>(
  context: string,
  query: string,
  result: PromiseSettledResult<{ data: T[] | null; error: unknown }>,
) {
  if (result.status === "rejected") {
    logSupabaseQueryException(context, query, result.reason);
    return [] as T[];
  }

  if (result.value.error) {
    logSupabaseQueryError(context, query, result.value.error);
    void getViewer().then(({ supabase }) => {
      if (supabase) void validateFeedReadiness(supabase);
    });
    return [] as T[];
  }

  return result.value.data ?? [];
}
