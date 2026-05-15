export const runtime = "edge";

import Link from "next/link";
import { AlertTriangle, BrainCircuit, FileText, Sparkles } from "lucide-react";
import { GenerateBriefButton } from "@/components/briefs/generate-brief-button";
import { PageHeader } from "@/components/shell/page-header";
import { getBriefs } from "@/lib/data/briefs";
import { formatRelativeTime } from "@/lib/format";

export default async function BriefsPage() {
  const briefs = await getBriefs();

  return (
    <>
      <PageHeader
        eyebrow="Briefs"
        title="AI intelligence briefs"
        description="Generate cached executive summaries from live Pulse clusters. Briefs use server-side AI only and stay empty when no provider is configured."
      />
      <section className="grid gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <div className="accent-border rounded-xl bg-rook-graphite p-5">
          <div className="flex items-center gap-3">
            <BrainCircuit className="h-7 w-7 text-rook-violet" />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-rook-cyan">
                Brief Engine
              </p>
              <h2 className="mt-1 text-2xl font-black text-white">Pulse clusters ready for synthesis</h2>
            </div>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {["Cluster related Signals", "Extract claims and counterclaims", "Cache sourced executive summary"].map((step) => (
              <div key={step} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
                <Sparkles className="h-4 w-4 text-rook-cyan" />
                <span className="text-sm font-bold text-rook-muted">{step}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {briefs.length === 0 && (
            <div className="surface-card rounded-xl p-8 text-center xl:col-span-2">
              <p className="text-lg font-black text-white">No Brief candidates</p>
              <p className="mt-2 text-sm text-rook-muted">Pulse clusters will appear here as Signals converge.</p>
            </div>
          )}
          {briefs.map((brief) => (
            <article key={`${brief.id}-${brief.cluster_key}`} className="surface-card rounded-xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-rook-violet/15 text-rook-violet">
                  <FileText className="h-5 w-5" />
                </div>
                <StatusBadge status={brief.status} />
              </div>
              <Link href={`/briefs/${brief.id}`} className="focus-ring mt-5 block rounded-md">
                <h2 className="text-xl font-black text-white hover:text-rook-cyan">{brief.title}</h2>
              </Link>
              {brief.summary ? (
                <p className="mt-3 line-clamp-4 text-sm leading-6 text-rook-muted">{brief.summary}</p>
              ) : (
                <div className="mt-3 flex gap-2 rounded-lg border border-rook-amber/20 bg-rook-amber/10 p-3 text-sm leading-6 text-rook-amber">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {brief.error_message ?? "No generated AI output yet. Generate a Brief when the AI provider is configured."}
                </div>
              )}
              <div className="mt-5 grid grid-cols-3 gap-2">
                <Metric label="Signals" value={brief.source_signal_ids.length} />
                <Metric label="Pulse" value={brief.candidate?.pulse_score ?? 0} />
                <Metric label="State" value={brief.status === "ready" ? 1 : 0} />
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold text-rook-muted">
                  {brief.generated_at ? `Generated ${formatRelativeTime(brief.generated_at)}` : "Cached generation pending"}
                </p>
                <GenerateBriefButton clusterKey={brief.cluster_key} label={brief.status === "ready" ? "Regenerate" : "Generate Brief"} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function StatusBadge({ status }: { status: "pending" | "ready" | "failed" }) {
  const styles = {
    pending: "border-rook-amber/25 bg-rook-amber/10 text-rook-amber",
    ready: "border-rook-green/25 bg-rook-green/10 text-rook-green",
    failed: "border-red-400/25 bg-red-400/10 text-red-200",
  };

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${styles[status]}`}>
      {status}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3 text-center">
      <p className="text-lg font-black text-white">{value}</p>
      <p className="mt-1 text-[11px] font-bold text-rook-muted">{label}</p>
    </div>
  );
}
