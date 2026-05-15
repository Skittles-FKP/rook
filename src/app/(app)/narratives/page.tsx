export const runtime = "edge";

import Link from "next/link";
import { Activity, GitCompareArrows, RadioTower } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { getNarrativeSystem } from "@/lib/narratives";

export default async function NarrativesPage() {
  const narratives = await getNarrativeSystem();

  return (
    <>
      <PageHeader
        eyebrow="Narratives"
        title="Narrative intelligence layer"
        description="Track emergence, acceleration, fragmentation, convergence, decay, contradictions, and operator consensus drift across the Signal Network."
      />
      <section className="grid gap-4 px-4 py-5 sm:px-6 lg:px-8">
        {narratives.length === 0 && (
          <div className="surface-card rounded-xl p-8 text-center">
            <p className="text-lg font-black text-white">No narratives detected</p>
            <p className="mt-2 text-sm text-rook-muted">Publish and amplify Signals to form narrative timelines.</p>
          </div>
        )}
        <div className="grid gap-4 xl:grid-cols-2">
          {narratives.map((narrative) => (
            <Link
              key={narrative.id}
              href={`/narratives/${narrative.id}`}
              className="surface-card focus-ring rounded-xl p-5 transition hover:border-rook-cyan/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-rook-cyan">
                    {narrative.timeline[0]?.phase ?? "Narrative"}
                  </p>
                  <h2 className="mt-2 text-xl font-black text-white">{narrative.title}</h2>
                </div>
                <span className="rounded-full border border-rook-green/25 bg-rook-green/10 px-3 py-1 text-xs font-black text-rook-green">
                  {narrative.confidence_score}% confidence
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-rook-muted">{narrative.summary}</p>
              <div className="mt-5 grid grid-cols-3 gap-2">
                <Metric icon={Activity} label="Accel" value={narrative.acceleration_score} />
                <Metric icon={GitCompareArrows} label="Frag" value={narrative.fragmentation_score} />
                <Metric icon={RadioTower} label="Density" value={narrative.operator_density_score} />
              </div>
            </Link>
          ))}
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
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <Icon className="h-4 w-4 text-rook-cyan" />
      <p className="mt-2 text-lg font-black text-white">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-rook-muted">{label}</p>
    </div>
  );
}
