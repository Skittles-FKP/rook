export const runtime = "edge";

import { Activity, BrainCircuit, Network, RadioTower } from "lucide-react";
import { IntelligenceGraph } from "@/components/graph/intelligence-graph";
import { LiveRoomPresence } from "@/components/graph/live-room-presence";
import { PulseRadar } from "@/components/pulse/pulse-radar";
import { PageHeader } from "@/components/shell/page-header";
import { SignalMedia } from "@/components/signals/signal-media";
import { getIntelligenceGraph } from "@/lib/intelligence";
import { getPulseSnapshot } from "@/lib/data/pulse";
import { formatRelativeTime } from "@/lib/format";
import { captureException } from "@/lib/observability";
import type { IntelligenceGraph as IntelligenceGraphData } from "@/lib/intelligence";

export default async function GraphPage() {
  const [graph, pulse] = await Promise.all([
    getIntelligenceGraph().catch((error): IntelligenceGraphData => {
      captureException(error, { route: "/graph", surface: "intelligence_graph" });

      return {
        nodes: [],
        edges: [],
        radar: [],
        narratives: [],
        collaborationRooms: [],
        updatedAt: new Date().toISOString(),
      };
    }),
    getPulseSnapshot(12).catch(() => ({ signals: [], clusters: [], events: [], updatedAt: new Date().toISOString() })),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Intelligence Graph"
        title="Network operating picture"
        description="Realtime relationships across Signals, operators, Flocks, topics, Briefs, and Pulse clusters. Zoom, pan, and monitor convergence without leaving the tactical shell."
      />
      <section className="grid gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat icon={Network} label="Nodes" value={graph.nodes.length} />
          <Stat icon={Activity} label="Links" value={graph.edges.length} />
          <Stat icon={RadioTower} label="Radar Contacts" value={graph.radar.length} />
          <Stat icon={BrainCircuit} label="Narratives" value={graph.narratives.length} />
        </div>
        <IntelligenceGraph nodes={graph.nodes} edges={graph.edges} />
        <div className="grid gap-4 xl:grid-cols-[1fr_0.86fr]">
          <PulseRadar points={graph.radar} />
          <div className="surface-card rounded-xl p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-rook-cyan">
                  Narrative Engine
                </p>
                <h2 className="mt-2 text-xl font-black text-white">Consensus and divergence</h2>
              </div>
              <span className="text-xs font-semibold text-rook-muted">
                {formatRelativeTime(graph.updatedAt)}
              </span>
            </div>
            <div className="mt-5 space-y-3">
              {graph.narratives.length === 0 && (
                <p className="text-sm text-rook-muted">No narrative convergence detected.</p>
              )}
              {graph.narratives.map((narrative) => (
                <article key={narrative.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                  <h3 className="font-black text-white">{narrative.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-rook-muted">{narrative.summary}</p>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <Meter label="Consensus" value={narrative.consensus_shift} />
                    <Meter label="Contradiction" value={narrative.contradiction_risk} />
                    <Meter label="Alignment" value={narrative.operator_alignment} />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
        <div className="surface-card rounded-xl p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-rook-cyan">
                Graph Signal Media
              </p>
              <h2 className="mt-2 text-xl font-black text-white">Embedded evidence layer</h2>
            </div>
            <span className="text-xs font-semibold text-rook-muted">{formatRelativeTime(pulse.updatedAt)}</span>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {pulse.signals.slice(0, 3).map((signal) => (
              <article key={signal.id} className="min-w-0 rounded-lg border border-white/10 bg-white/[0.035] p-3">
                <h3 className="mobile-readable text-sm font-black leading-5 text-white">{signal.title}</h3>
                <SignalMedia signal={signal} compact fallback />
              </article>
            ))}
          </div>
        </div>
        <div className="surface-card rounded-xl p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-rook-cyan">
                Live Intelligence Rooms
              </p>
              <h2 className="mt-2 text-xl font-black text-white">Collaborative Brief surfaces</h2>
            </div>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {graph.collaborationRooms.map((room) => (
              <article key={room.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black text-white">{room.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-rook-muted">{room.detail}</p>
                  </div>
                  <LiveRoomPresence roomId={room.id} />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Meter label="Operators" value={room.operators} />
                  <Meter label="Signals" value={room.signal_count} />
                  <Meter label="Pulse" value={room.pulse_score} />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="surface-card rounded-xl p-4">
      <div className="flex items-center justify-between gap-3">
        <Icon className="h-5 w-5 text-rook-cyan" />
        <p className="text-2xl font-black text-white">{value}</p>
      </div>
      <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-rook-muted">{label}</p>
    </div>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  const width = Math.min(100, Math.max(4, value));
  return (
    <div className="rounded-lg bg-white/[0.04] p-3">
      <p className="text-sm font-black text-white">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-rook-muted">{label}</p>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-rook-blue to-rook-green" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
