import { getBriefs } from "@/lib/data/briefs";
import { getPulseSnapshot } from "@/lib/data/pulse";
import { getIntelligenceGraph } from "@/lib/intelligence";

export async function getInsightEngineSnapshot() {
  const [pulse, briefs, graph] = await Promise.all([
    getPulseSnapshot(72),
    getBriefs(),
    getIntelligenceGraph(),
  ]);

  const signalQuality = pulse.signals.length === 0
    ? 0
    : Math.round(
        pulse.signals.reduce((total, signal) => total + (signal.confidence_score ?? 50) + signal.pulse_score / 2, 0) /
          pulse.signals.length,
      );

  return {
    pulseFormation: pulse.clusters.length,
    narrativeSpread: Math.round(pulse.clusters.reduce((total, cluster) => total + cluster.flock_count, 0)),
    operatorRetention: Math.min(100, Math.round(42 + pulse.signals.filter((signal) => signal.author).length * 3)),
    signalQuality: Math.min(100, signalQuality),
    briefEngagement: briefs.filter((brief) => brief.status === "ready").length,
    graphActivity: graph.edges.length,
    networkHealth: Math.min(100, Math.round(55 + pulse.clusters.length * 4 + graph.nodes.length / 6)),
  };
}
