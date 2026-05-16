export const runtime = "edge";

import Link from "next/link";
import { AlertTriangle, BrainCircuit, Mail, Shield, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { getBriefs } from "@/lib/data/briefs";
import { getFlocks } from "@/lib/data/flocks";
import { getPulseSnapshot } from "@/lib/data/pulse";

export default async function AdminPage() {
  const [pulse, briefs, flocks] = await Promise.all([getPulseSnapshot(60), getBriefs(), getFlocks()]);
  const reports = pulse.signals.filter((signal) => signal.anomaly_score > 4);

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Moderation and launch operations"
        description="Operator management, Signal review, Pulse monitoring, report triage, abuse controls, and launch-readiness telemetry."
      />
      <section className="grid gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <div className="grid gap-3 sm:grid-cols-4">
          <AdminStat icon={UsersRound} label="Flocks" value={flocks.length} />
          <AdminStat icon={Shield} label="Signals Monitored" value={pulse.signals.length} />
          <AdminStat icon={BrainCircuit} label="Brief Queue" value={briefs.length} />
          <AdminStat icon={AlertTriangle} label="Review Flags" value={reports.length} />
        </div>
        <Link href="/admin/email-health" className="surface-card focus-ring inline-flex w-fit items-center gap-2 rounded-xl px-4 py-3 text-sm font-black text-rook-cyan transition hover:border-rook-cyan/40 hover:text-white">
          <Mail className="h-4 w-4" />
          Email health console
        </Link>
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="surface-card rounded-xl p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-rook-cyan">Pulse Monitoring</p>
            <div className="mt-4 space-y-3">
              {pulse.clusters.slice(0, 8).map((cluster) => (
                <div key={cluster.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-black text-white">{cluster.title}</p>
                    <span className="text-xs font-black text-rook-green">+{cluster.pulse_score}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-rook-muted">{cluster.narrative}</p>
                </div>
              ))}
            </div>
          </article>
          <article className="surface-card rounded-xl p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-rook-cyan">Signal Moderation</p>
            <div className="mt-4 space-y-3">
              {(reports.length > 0 ? reports : pulse.signals.slice(0, 5)).map((signal) => (
                <div key={signal.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-white">{signal.title}</p>
                      <p className="mt-1 text-xs text-rook-muted">
                        @{signal.author?.username ?? "unknown"} · anomaly {signal.anomaly_score}
                      </p>
                    </div>
                    <span className="rounded-full border border-rook-amber/25 bg-rook-amber/10 px-3 py-1 text-xs font-black text-rook-amber">
                      Review
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
        <div className="surface-card rounded-xl p-5">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-rook-cyan">Abuse Controls</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {["Throttle Signal publishing", "Suspend operator amplification", "Quarantine Pulse cluster"].map((control) => (
              <button key={control} disabled className="min-h-12 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-left text-sm font-black text-rook-muted">
                {control}
              </button>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function AdminStat({
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
