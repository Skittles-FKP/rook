export const runtime = "edge";

import { Database, Globe2, RadioTower } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { getExternalSources, getFusionSurfaces } from "@/lib/ingestion";

export default function IngestPage() {
  const sources = getExternalSources();
  const surfaces = getFusionSurfaces();

  return (
    <>
      <PageHeader
        eyebrow="External Ingestion"
        title="Multi-network intelligence fusion"
        description="Pipeline foundations for X, Reddit, RSS, news, research, and market feeds that convert external data into Signals, Pulse events, narratives, and Brief candidates."
      />
      <section className="grid gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <article className="surface-card rounded-xl p-5">
            <div className="flex items-center gap-3">
              <Globe2 className="h-5 w-5 text-rook-cyan" />
              <h2 className="text-xl font-black text-white">Source pipelines</h2>
            </div>
            <div className="mt-5 space-y-3">
              {sources.map((source) => (
                <div key={source.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-black text-white">{source.label}</p>
                    <span className={source.status === "configured" ? "text-rook-green" : "text-rook-amber"}>
                      {source.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-rook-muted">Cadence {source.cadence}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {source.convertsTo.map((target) => (
                      <span key={target} className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-rook-muted">
                        {target}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </article>
          <article className="surface-card rounded-xl p-5">
            <div className="flex items-center gap-3">
              <RadioTower className="h-5 w-5 text-rook-cyan" />
              <h2 className="text-xl font-black text-white">Strategic dashboards</h2>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {surfaces.map((surface) => (
                <div key={surface.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-black text-white">{surface.label}</h3>
                    <Database className="h-4 w-4 text-rook-cyan" />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-rook-muted">{surface.detail}</p>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <Metric label="Sources" value={surface.sources} />
                    <Metric label="Pulse" value={surface.pulse} />
                    <Metric label="Risk" value={surface.risk} />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>
    </>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white/[0.04] p-3">
      <p className="font-black text-white">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-rook-muted">{label}</p>
    </div>
  );
}
