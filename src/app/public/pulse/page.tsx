import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PulseRadar } from "@/components/pulse/pulse-radar";
import { RookMark } from "@/components/brand";
import { demoClusters, getDemoGraph } from "@/lib/demo-data";

export default function PublicPulsePage() {
  const graph = getDemoGraph();

  return (
    <main className="min-h-screen bg-radial-command px-4 py-6 text-rook-text sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex items-center justify-between gap-4">
          <RookMark />
          <Link href="/waitlist" className="focus-ring rounded-lg bg-white px-4 py-2 text-sm font-black text-rook-void">
            Request Invite
          </Link>
        </header>
        <section className="mt-8 grid gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-rook-cyan">Public Pulse</p>
            <h1 className="mt-3 text-4xl font-black text-white">Live narrative movement preview</h1>
          </div>
          <PulseRadar points={graph.radar} />
          <div className="grid gap-4 lg:grid-cols-2">
            {demoClusters.map((cluster) => (
              <article key={cluster.id} className="surface-card rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-xl font-black text-white">{cluster.title}</h2>
                  <span className="text-sm font-black text-rook-green">+{cluster.pulse_score}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-rook-muted">{cluster.narrative}</p>
                <Link href="/demo" className="focus-ring mt-4 inline-flex items-center gap-2 rounded-md text-sm font-black text-white">
                  Inspect graph
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
