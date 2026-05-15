export const runtime = "edge";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  Gauge,
  Radar,
  ScanSearch,
  ShieldCheck,
} from "lucide-react";
import { AgentActivityStream } from "@/components/agents/agent-activity-stream";
import { AlertPreferences } from "@/components/agents/alert-preferences";
import { AutonomousBriefSweepButton } from "@/components/agents/autonomous-brief-sweep-button";
import { PageHeader } from "@/components/shell/page-header";
import { getAutonomousIntelligence } from "@/lib/agents";

export default async function AgentsPage() {
  const system = await getAutonomousIntelligence().catch((error) => {
    console.error("[agents] autonomous intelligence retrieval failed; rendering empty agent state", error);
    return {
      agents: [],
      activity: [],
      alerts: [],
      quality: [],
      narratives: [],
    };
  });
  const topNarrative = system.narratives[0];

  return (
    <>
      <PageHeader
        eyebrow="Autonomous Intelligence"
        title="AI operator agents"
        description="Autonomous monitoring entities watch narrative drift, Pulse formation, signal quality, and anomaly escalation without turning Rook into a chatbot interface."
      />
      <section className="grid gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <div className="accent-border rounded-xl bg-rook-graphite p-5">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-rook-cyan/10 text-rook-cyan">
                  <ScanSearch className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-rook-cyan">
                    Agent Control
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-white">Autonomous narrative watch</h2>
                </div>
              </div>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-rook-muted">
                Agents monitor live intelligence surfaces, escalate anomalies, and can generate sourced Briefs only through the configured server-side AI provider.
              </p>
            </div>
            <AutonomousBriefSweepButton />
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-4">
            <Stat icon={Radar} label="Pulse Projection" value={topNarrative?.predictions.pulse_formation_probability ?? 0} suffix="%" />
            <Stat icon={Activity} label="Acceleration" value={topNarrative?.predictions.acceleration_probability ?? 0} suffix="%" />
            <Stat icon={AlertTriangle} label="Fragmentation" value={topNarrative?.predictions.fragmentation_probability ?? 0} suffix="%" />
            <Stat icon={ShieldCheck} label="Quality Watch" value={system.quality.length} />
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_0.82fr]">
          <div className="grid gap-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {system.agents.map((agent) => (
                <article key={agent.id} className="surface-card rounded-xl p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-rook-cyan">
                        {agent.domain}
                      </p>
                      <h2 className="mt-2 text-xl font-black text-white">{agent.name}</h2>
                    </div>
                    <span className={statusClass(agent.status)}>{agent.status}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-rook-muted">{agent.mission}</p>
                  <p className="mt-4 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm font-semibold text-white">
                    {agent.last_action}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Meter label="Confidence" value={agent.confidence} />
                    <Meter label="Quality" value={agent.signal_quality_score} />
                  </div>
                </article>
              ))}
            </div>
            <AgentActivityStream activity={system.activity} />
          </div>

          <div className="grid gap-4 content-start">
            <AlertPreferences preferences={system.alerts} />
            <div className="surface-card rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-rook-amber/10 text-rook-amber">
                  <Gauge className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-rook-cyan">
                    Signal Quality
                  </p>
                  <h2 className="mt-1 text-xl font-black text-white">Moderation watch</h2>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {system.quality.map((finding) => (
                  <article key={finding.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-black text-white">{finding.label}</h3>
                      <span className="text-sm font-black text-rook-amber">{Math.round(finding.risk)}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-rook-muted">{finding.detail}</p>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-rook-amber" style={{ width: `${Math.min(100, finding.risk)}%` }} />
                    </div>
                  </article>
                ))}
              </div>
            </div>
            <div className="surface-card rounded-xl p-5">
              <div className="flex items-center gap-3">
                <BrainCircuit className="h-5 w-5 text-rook-violet" />
                <h2 className="text-xl font-black text-white">Predictive Pulse Engine</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-rook-muted">
                Probability estimates are derived from live Pulse velocity, operator density, fragmentation, and contradiction surfaces.
              </p>
              <Link
                href={topNarrative ? `/narratives/${topNarrative.id}` : "/narratives"}
                className="focus-ring mt-4 inline-flex min-h-10 items-center rounded-lg border border-white/10 px-4 text-sm font-black text-white transition hover:border-rook-cyan/40 hover:text-rook-cyan"
              >
                Inspect Narrative
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function statusClass(status: "monitoring" | "escalating" | "briefing" | "quiet") {
  const styles = {
    monitoring: "border-rook-green/25 bg-rook-green/10 text-rook-green",
    escalating: "border-rook-amber/25 bg-rook-amber/10 text-rook-amber",
    briefing: "border-rook-violet/30 bg-rook-violet/10 text-rook-violet",
    quiet: "border-white/10 bg-white/[0.04] text-rook-muted",
  };

  return `rounded-full border px-3 py-1 text-xs font-black uppercase ${styles[status]}`;
}

function Stat({
  icon: Icon,
  label,
  value,
  suffix = "",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-center justify-between gap-3">
        <Icon className="h-5 w-5 text-rook-cyan" />
        <p className="text-2xl font-black text-white">
          {value}
          {suffix}
        </p>
      </div>
      <p className="mt-2 text-[11px] font-black uppercase tracking-[0.14em] text-rook-muted">{label}</p>
    </div>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white/[0.04] p-3">
      <p className="text-lg font-black text-white">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-rook-muted">{label}</p>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-rook-blue to-rook-green" style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}
