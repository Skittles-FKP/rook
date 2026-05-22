export const runtime = "edge";

import Link from "next/link";
import { Activity, ArrowUpRight, Layers3, RadioTower, ScanLine, TimerReset } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { PulseLiveIndicator } from "@/components/pulse/pulse-live-indicator";
import { PulseRadar } from "@/components/pulse/pulse-radar";
import { SignalMedia } from "@/components/signals/signal-media";
import { getPulseSnapshot } from "@/lib/data/pulse";
import { getIntelligenceGraph } from "@/lib/intelligence";

export default async function PulsePage() {
  const [snapshotResult, graphResult] = await Promise.allSettled([getPulseSnapshot(40), getIntelligenceGraph()]);
  const snapshot = snapshotResult.status === "fulfilled"
    ? snapshotResult.value
    : { signals: [], clusters: [], events: [], updatedAt: new Date().toISOString() };
  const graph = graphResult.status === "fulfilled"
    ? graphResult.value
    : { nodes: [], edges: [], radar: [], narratives: [], collaborationRooms: [], updatedAt: new Date().toISOString() };
  const degraded = snapshotResult.status === "rejected" || graphResult.status === "rejected";

  if (snapshotResult.status === "rejected") {
    console.error("[pulse] getPulseSnapshot failed after defensive fallback", snapshotResult.reason);
  }

  if (graphResult.status === "rejected") {
    console.error("[pulse] getIntelligenceGraph failed after defensive fallback", graphResult.reason);
  }

  const topSignals = snapshot.signals.slice(0, 8);
  const anomalies = snapshot.signals
    .filter((signal) => signal.anomaly_score > 0)
    .sort((a, b) => b.anomaly_score - a.anomaly_score)
    .slice(0, 4);

  return (
    <>
      <PageHeader
        eyebrow="Pulse"
        title="Realtime intelligence monitor"
        description="Detect accelerating Signals, narrative convergence, anomaly activity, emerging topics, and cross-Flock amplification without reducing the network to trends."
        action={<PulseLiveIndicator />}
      />
      <section className="mx-auto grid w-full max-w-6xl gap-4 px-3 py-5 sm:px-6 lg:px-8">
        {degraded && (
          <div className="surface-card rounded-xl border-rook-amber/30 p-4">
            <p className="text-sm font-black text-rook-amber">Pulse running in degraded mode</p>
            <p className="mt-2 text-sm leading-6 text-rook-muted">
              One Pulse source failed validation. Rook preserved the monitor while Supabase diagnostics are logged.
            </p>
          </div>
        )}
        <div className="surface-card overflow-hidden rounded-xl">
          <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
            <Activity className="h-4 w-4 text-rook-green" />
            <p className="text-xs font-black uppercase tracking-[0.2em] text-rook-muted">
              Pulse ticker
            </p>
          </div>
          <div className="grid min-w-0 gap-2 overflow-hidden px-3 py-3 sm:flex sm:gap-3 sm:overflow-x-auto sm:px-4">
            {topSignals.length === 0 ? (
              <span className="text-sm text-rook-muted">Awaiting velocity data.</span>
            ) : (
              topSignals.map((signal) => (
                <Link
                  key={signal.id}
                  href={getSignalHref(signal.id)}
                  className="focus-ring inline-flex w-full min-w-0 max-w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 transition hover:border-rook-cyan/40 sm:min-w-64 sm:max-w-[18rem]"
                >
                  <span className="truncate text-sm font-bold text-white">{signal.title}</span>
                  <span className="shrink-0 text-xs font-black text-rook-green">+{signal.pulse_score}</span>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          {["15m", "1h", "6h", "24h"].map((range, index) => (
            <div
              key={range}
              className={`rounded-lg border px-4 py-3 ${
                index === 2
                  ? "border-rook-cyan/30 bg-rook-cyan/10 text-white"
                  : "border-white/10 bg-white/[0.035] text-rook-muted"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-black">{range}</span>
                <TimerReset className="h-4 w-4" />
              </div>
              <p className="mt-1 text-xs font-semibold">monitoring window</p>
            </div>
          ))}
        </div>

        <PulseRadar points={graph.radar} />

        {topSignals.length === 0 && (
          <div className="surface-card rounded-xl p-8 text-center">
            <p className="text-lg font-black text-white">Pulse is quiet</p>
            <p className="mt-2 text-sm text-rook-muted">
              Publish and amplify Signals to generate trend velocity.
            </p>
          </div>
        )}

        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Layers3 className="h-5 w-5 text-rook-cyan" />
              <h2 className="text-lg font-black text-white">Narrative Clusters</h2>
            </div>
            {snapshot.clusters.slice(0, 6).map((cluster, index) => (
              <article key={cluster.id} className="surface-card rounded-xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-rook-muted">
                      Cluster {index + 1}
                    </p>
                    <h3 className="mt-2 text-xl font-black text-white">{cluster.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-rook-muted">{cluster.narrative}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-rook-green/10 px-3 py-1 text-xs font-black text-rook-green">
                    +{cluster.pulse_score}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </div>
                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  <Metric label="Signals" value={cluster.signals.length} />
                  <Metric label="Flock spread" value={Math.max(cluster.flock_count, 1)} />
                  <Metric label="Anomaly" value={cluster.anomaly_score} />
                </div>
                {cluster.signals[0] && (
                  <div className="mt-4">
                    <SignalMedia signal={cluster.signals[0]} compact fallback />
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {cluster.terms.map((term) => (
                    <span key={term} className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-rook-muted">
                      {term}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-rook-amber" />
              <h2 className="text-lg font-black text-white">Anomaly Activity</h2>
            </div>
            {anomalies.length === 0 && (
              <div className="surface-card rounded-xl p-5 text-sm text-rook-muted">
                No anomaly pattern exceeds the current baseline.
              </div>
            )}
            {anomalies.map((signal) => (
              <Link
                href={getSignalHref(signal.id)}
                key={signal.id}
                className="surface-card focus-ring block rounded-xl p-5 transition hover:border-rook-amber/40"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-rook-amber/10 text-rook-amber">
                    <RadioTower className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-black text-rook-amber">a{signal.anomaly_score}</span>
                </div>
                <h3 className="mt-4 text-base font-black text-white">{signal.title}</h3>
                <p className="mt-2 text-sm leading-6 text-rook-muted">
                  Velocity {signal.velocity}/h, comments {signal.comment_velocity}/h, amplifies {signal.amplification_velocity}/h.
                </p>
                <SignalMedia signal={signal} />
                <div className="mt-3 flex flex-wrap gap-2">
                  {signal.pulse_labels.map((label) => (
                    <span key={label} className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] font-black text-rook-muted">
                      {label}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function getSignalHref(id: string) {
  return isUuid(id) ? `/signals/${id}` : "/feed";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <p className="text-lg font-black text-white">{value}</p>
      <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-rook-muted">{label}</p>
    </div>
  );
}
