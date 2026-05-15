import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, BrainCircuit, GitCompareArrows, RadioTower, ShieldCheck } from "lucide-react";
import { DriftPanel } from "@/components/narratives/drift-panel";
import { NarrativeTimeline } from "@/components/narratives/narrative-timeline";
import { ReplayPanel } from "@/components/narratives/replay-panel";
import { PageHeader } from "@/components/shell/page-header";
import { getNarrativeById } from "@/lib/narratives";

export default async function NarrativeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const narrative = await getNarrativeById(id);

  if (!narrative) {
    notFound();
  }

  return (
    <>
      <PageHeader
        eyebrow="Narrative Detail"
        title={narrative.title}
        description={narrative.summary}
      />
      <section className="grid gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <Link href="/narratives" className="focus-ring inline-flex w-fit items-center gap-2 rounded-lg text-sm font-bold text-rook-muted hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Narrative index
        </Link>
        <div className="grid gap-3 sm:grid-cols-5">
          <Metric icon={ShieldCheck} label="Confidence" value={narrative.confidence_score} />
          <Metric icon={AlertTriangle} label="Volatility" value={narrative.volatility_score} />
          <Metric icon={GitCompareArrows} label="Fragmentation" value={narrative.fragmentation_score} />
          <Metric icon={RadioTower} label="Acceleration" value={narrative.acceleration_score} />
          <Metric icon={BrainCircuit} label="Density" value={narrative.operator_density_score} />
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <NarrativeTimeline narrative={narrative} />
          <DriftPanel narrative={narrative} />
        </div>
        <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
          <article className="surface-card rounded-xl p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-rook-cyan">Contradiction Map</p>
            <h2 className="mt-2 text-xl font-black text-white">Conflicting intelligence links</h2>
            <div className="mt-5 space-y-3">
              {narrative.contradictions.length === 0 && (
                <p className="text-sm leading-6 text-rook-muted">No high-confidence contradictions detected in this narrative.</p>
              )}
              {narrative.contradictions.map((pair) => (
                <div key={pair.id} className="rounded-lg border border-rook-amber/25 bg-rook-amber/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-black text-white">Conflict score {pair.score}</p>
                    <GitCompareArrows className="h-4 w-4 text-rook-amber" />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-rook-muted">{pair.signal_a_title}</p>
                  <p className="mt-2 text-sm leading-6 text-rook-muted">{pair.signal_b_title}</p>
                  <p className="mt-3 text-xs font-semibold text-rook-amber">{pair.rationale}</p>
                </div>
              ))}
            </div>
          </article>
          <ReplayPanel narrative={narrative} />
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <article className="surface-card rounded-xl p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-rook-cyan">Predictive Pulse</p>
            <h2 className="mt-2 text-xl font-black text-white">Early-stage probability estimates</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ["Acceleration", narrative.predictions.acceleration_probability],
                ["Pulse formation", narrative.predictions.pulse_formation_probability],
                ["Operator convergence", narrative.predictions.operator_convergence_probability],
                ["Fragmentation", narrative.predictions.fragmentation_probability],
              ].map(([label, value]) => (
                <Probability key={label} label={String(label)} value={Number(value)} />
              ))}
            </div>
          </article>
          <article className="surface-card rounded-xl p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-rook-cyan">Operator Contributions</p>
            <h2 className="mt-2 text-xl font-black text-white">Alignment history</h2>
            <div className="mt-5 space-y-3">
              {narrative.operator_contributions.length === 0 && (
                <p className="text-sm text-rook-muted">No operator contribution history yet.</p>
              )}
              {narrative.operator_contributions.map((operator) => (
                <div key={operator.username} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-black text-white">{operator.operator}</p>
                      <p className="mt-1 text-xs text-rook-muted">@{operator.username} · {operator.signals} Signals</p>
                    </div>
                    <span className="text-xs font-black text-rook-green">{operator.alignment}</span>
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

function Metric({
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
      <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-rook-muted">{label}</p>
    </div>
  );
}

function Probability({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-black text-white">{label}</span>
        <span className="font-black text-rook-green">{value}%</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-rook-blue to-rook-green" style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}
