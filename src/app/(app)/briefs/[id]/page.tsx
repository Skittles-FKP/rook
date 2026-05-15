export const runtime = "edge";

import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, BrainCircuit, CheckCircle2, GitCompareArrows, Waves } from "lucide-react";
import { GenerateBriefButton } from "@/components/briefs/generate-brief-button";
import { PageHeader } from "@/components/shell/page-header";
import { getBriefById } from "@/lib/data/briefs";
import { getSignalById } from "@/lib/data/signals";
import { formatRelativeTime } from "@/lib/format";
import type { SignalWithAuthor } from "@/lib/supabase/types";

export default async function BriefDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const brief = await getBriefById(id);

  if (!brief) {
    notFound();
  }

  const sourceSignals = (
    await Promise.all(brief.source_signal_ids.slice(0, 8).map((signalId) => getSignalById(signalId)))
  ).filter((signal): signal is SignalWithAuthor => Boolean(signal));

  return (
    <>
      <PageHeader
        eyebrow="Brief Detail"
        title={brief.title}
        description="Cached AI synthesis with source Signals, narratives, contradictions, consensus movement, and Flock context."
        action={<GenerateBriefButton clusterKey={brief.cluster_key} label={brief.status === "ready" ? "Regenerate" : "Generate Brief"} />}
      />
      <section className="grid gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <Link href="/briefs" className="focus-ring inline-flex w-fit items-center gap-2 rounded-lg text-sm font-bold text-rook-muted hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Brief index
        </Link>

        {brief.status !== "ready" && (
          <div className="rounded-xl border border-rook-amber/25 bg-rook-amber/10 p-4 text-sm leading-6 text-rook-amber">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <p>
                {brief.error_message ??
                  "This Brief has no generated AI output yet. Configure OPENAI_API_KEY and generate from the server-side action."}
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <article className="surface-card rounded-xl p-5">
            <div className="flex items-center gap-3">
              <BrainCircuit className="h-6 w-6 text-rook-violet" />
              <h2 className="text-xl font-black text-white">Executive Summary</h2>
            </div>
            <p className="mt-4 text-sm leading-7 text-rook-muted">
              {brief.summary ?? "No AI-generated summary is cached for this cluster."}
            </p>
            <p className="mt-5 text-xs font-semibold text-rook-muted">
              {brief.generated_at ? `Generated ${formatRelativeTime(brief.generated_at)}` : "Generation pending"}
            </p>
          </article>

          <article className="surface-card rounded-xl p-5">
            <div className="flex items-center gap-3">
              <Waves className="h-6 w-6 text-rook-cyan" />
              <h2 className="text-xl font-black text-white">Sentiment Movement</h2>
            </div>
            <p className="mt-4 text-sm leading-7 text-rook-muted">
              {brief.sentiment_movement ?? "No sentiment movement has been generated."}
            </p>
            <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.035] p-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-rook-muted">Flock Summary</p>
              <p className="mt-2 text-sm leading-6 text-rook-muted">
                {brief.flock_summary ?? "No Flock summary has been generated."}
              </p>
            </div>
          </article>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <BriefList title="Major Narratives" icon="check" items={brief.narratives} />
          <BriefList title="Contradictions" icon="compare" items={brief.contradictions} />
          <BriefList title="Consensus Shifts" icon="wave" items={brief.consensus_shifts} />
        </div>

        <div className="surface-card rounded-xl p-5">
          <h2 className="text-xl font-black text-white">Source Signals</h2>
          <div className="mt-4 grid gap-3">
            {sourceSignals.length === 0 && (
              <p className="text-sm text-rook-muted">Source Signals are no longer available.</p>
            )}
            {sourceSignals.map((signal) => (
              <Link
                key={signal.id}
                href={`/signals/${signal.id}`}
                className="focus-ring rounded-lg border border-white/10 bg-white/[0.035] p-4 transition hover:border-rook-cyan/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-black text-white">{signal.title}</h3>
                  <span className="text-xs font-bold text-rook-muted">
                    {signal.flock?.name ?? "No Flock"}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-rook-muted">{signal.body}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function BriefList({
  title,
  icon,
  items,
}: {
  title: string;
  icon: "check" | "compare" | "wave";
  items: string[];
}) {
  const Icon = icon === "check" ? CheckCircle2 : icon === "compare" ? GitCompareArrows : Waves;

  return (
    <article className="surface-card rounded-xl p-5">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-rook-cyan" />
        <h2 className="font-black text-white">{title}</h2>
      </div>
      <div className="mt-4 space-y-3">
        {items.length === 0 && <p className="text-sm leading-6 text-rook-muted">No generated entries.</p>}
        {items.map((item) => (
          <p key={item} className="rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-rook-muted">
            {item}
          </p>
        ))}
      </div>
    </article>
  );
}
