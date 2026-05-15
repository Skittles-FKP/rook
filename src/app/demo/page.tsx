export const runtime = "edge";

import Link from "next/link";
import { Activity, BrainCircuit, Network, RadioTower } from "lucide-react";
import { IntelligenceGraph } from "@/components/graph/intelligence-graph";
import { PulseRadar } from "@/components/pulse/pulse-radar";
import { RookMark } from "@/components/brand";
import { SignalCard } from "@/components/signal-card";
import { demoBriefs, demoFlocks, demoOperators, demoSignals, getDemoGraph } from "@/lib/demo-data";

export default function DemoPage() {
  const graph = getDemoGraph();

  return (
    <main className="min-h-screen bg-radial-command text-rook-text">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-rook-void/80 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <RookMark />
          <div className="flex items-center gap-2">
            <Link href="/signup" className="focus-ring rounded-lg bg-white px-4 py-2 text-sm font-black text-rook-void transition hover:bg-rook-cyan">
              Create Operator
            </Link>
          </div>
        </div>
      </header>
      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat icon={RadioTower} label="Demo Signals" value={demoSignals.length} />
          <Stat icon={Activity} label="Flocks" value={demoFlocks.length} />
          <Stat icon={BrainCircuit} label="Briefs" value={demoBriefs.length} />
          <Stat icon={Network} label="Graph Nodes" value={graph.nodes.length} />
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
          <IntelligenceGraph nodes={graph.nodes} edges={graph.edges} />
          <div className="grid content-start gap-4">
            <PulseRadar points={graph.radar} />
            <article className="surface-card rounded-xl p-5">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-rook-cyan">Demo Operators</p>
              <div className="mt-4 space-y-3">
                {demoOperators.map((operator) => (
                  <Link key={operator.id} href={`/public/operators/${operator.username}`} className="focus-ring flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.035] p-3 transition hover:border-rook-cyan/40">
                    <div>
                      <p className="font-black text-white">{operator.display_name}</p>
                      <p className="mt-1 text-xs text-rook-muted">@{operator.username}</p>
                    </div>
                    <span className="text-xs font-black text-rook-green">{operator.reputation_score}</span>
                  </Link>
                ))}
              </div>
            </article>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {demoSignals.map((signal) => (
            <SignalCard key={signal.id} signal={signal} />
          ))}
        </div>
      </section>
    </main>
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
      <div className="flex items-center justify-between">
        <Icon className="h-5 w-5 text-rook-cyan" />
        <p className="text-2xl font-black text-white">{value}</p>
      </div>
      <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-rook-muted">{label}</p>
    </div>
  );
}
