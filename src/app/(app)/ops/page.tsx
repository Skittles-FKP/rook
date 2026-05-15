export const runtime = "edge";

import { Activity, AlertTriangle, CheckCircle2, Database, LineChart, Server, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { getInsightEngineSnapshot } from "@/lib/analytics";
import { getTierMatrix } from "@/lib/entitlements";
import { getObservabilityStatus } from "@/lib/observability";
import { getDeploymentChecklist, getProductionReadiness } from "@/lib/production";
import { getAiQueueSnapshot } from "@/lib/queue";
import { getAiOperatorMetrics } from "@/lib/ai/operator-metrics";
import { getAutonomousDebugMetrics } from "@/lib/ops-debug";
import { getNarrativeEscalationSnapshot } from "@/lib/narrative-escalation";
import { AutonomousDebugRealtime } from "@/components/ops/autonomous-debug-realtime";

export default async function OpsPage() {
  const [queue, analytics, aiMetrics, debugMetrics, narrativeEscalation] = await Promise.all([
    getAiQueueSnapshot(),
    getInsightEngineSnapshot(),
    getAiOperatorMetrics(),
    getAutonomousDebugMetrics(),
    getNarrativeEscalationSnapshot(4),
  ]);
  const readiness = getProductionReadiness();
  const checklist = getDeploymentChecklist();
  const observability = getObservabilityStatus();
  const entitlements = getTierMatrix();

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Production control plane"
        description="Deployment readiness, observability hooks, AI queue health, security posture, analytics, and monetization infrastructure for institutional operation."
      />
      <section className="grid gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <div className="grid gap-3 md:grid-cols-4">
          <Stat icon={Server} label="Environment" value={readiness.environment} />
          <Stat icon={ShieldCheck} label="Production Health" value={readiness.healthy ? "ready" : "blocked"} />
          <Stat icon={Database} label="Queue Jobs" value={queue.length} />
          <Stat icon={LineChart} label="Network Health" value={`${analytics.networkHealth}%`} />
        </div>

        <Panel title="Autonomous Signal Network" eyebrow="AI Spend + Safety">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <CompactMetric label="Spend Today" value={`$${aiMetrics.spendToday.toFixed(4)}`} />
            <CompactMetric label="Token Usage" value={aiMetrics.tokenUsageToday.toLocaleString()} />
            <CompactMetric label="Active Agents" value={aiMetrics.activeAgents} />
            <CompactMetric label="Queue Depth" value={aiMetrics.queueDepth} />
            <CompactMetric label="Generation Failures" value={aiMetrics.generationFailures} />
            <CompactMetric label="Sweep Cadence" value={aiMetrics.sweepCadence} />
            <CompactMetric label="Signals Today" value={`${aiMetrics.autonomousSignalsToday}/${aiMetrics.dailySignalCap}`} />
            <CompactMetric label="Cooldown Status" value={aiMetrics.cooldownStatus} />
            <CompactMetric label="Latest Sweep" value={aiMetrics.latestAutonomousSweep ?? "none"} />
            <CompactMetric label="Throttle State" value={aiMetrics.autonomousSignalsToday >= aiMetrics.dailySignalCap ? "capped" : "nominal"} />
          </div>
        </Panel>

        <Panel title="Narrative Escalation Engine" eyebrow="V1 Runtime">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <CompactMetric label="Processed Clusters" value={narrativeEscalation.processedClusters} />
            <CompactMetric label="Active Escalations" value={narrativeEscalation.escalations.length} />
            <CompactMetric label="Top Score" value={narrativeEscalation.topScore} />
            <CompactMetric label="Updated" value={narrativeEscalation.updatedAt} />
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {narrativeEscalation.escalations.length === 0 && (
              <p className="rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm text-rook-muted">
                No narrative escalation has crossed the V1 threshold.
              </p>
            )}
            {narrativeEscalation.escalations.map((item) => (
              <div key={item.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-black text-white">{item.title}</p>
                  <span className={item.level === "critical" ? "text-rook-amber" : "text-rook-cyan"}>
                    {item.level}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-rook-muted">{item.recommendedAction}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Autonomous Feed Debug" eyebrow="Temporary Pipeline Trace">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <CompactMetric label="Autonomous Signals Inserted" value={debugMetrics.autonomousSignalsInserted} />
            <AutonomousDebugRealtime />
            <CompactMetric label="Active Agents" value={debugMetrics.activeAgents} />
            <CompactMetric label="Failed Inserts" value={debugMetrics.failedInserts} />
            <CompactMetric label="Feed Query Count" value={debugMetrics.feedQueryCount} />
            <CompactMetric label="Latest AI Signal" value={debugMetrics.latestAiSignalTimestamp ?? "none"} />
            <CompactMetric label="Service Role" value={debugMetrics.serviceRoleReady ? "ready" : "missing"} />
            <CompactMetric label="Checked" value={debugMetrics.checkedAt} />
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <DebugList title="Latest AI Signal IDs" items={debugMetrics.latestAiSignalIds} empty="No AI Signal rows found." />
            <DebugList title="Feed Signal IDs" items={debugMetrics.feedSignalIds.slice(0, 10)} empty="No feed rows retrieved." />
          </div>
          {debugMetrics.errors.length > 0 && (
            <div className="mt-4 rounded-lg border border-rook-amber/30 bg-rook-amber/10 p-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-rook-amber">Diagnostics</p>
              <div className="mt-2 space-y-1">
                {debugMetrics.errors.map((error) => (
                  <p key={error} className="text-xs font-semibold text-rook-muted">{error}</p>
                ))}
              </div>
            </div>
          )}
        </Panel>

        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <Panel title="Deployment Readiness" eyebrow="Vercel">
            <div className="space-y-3">
              {checklist.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.035] p-3">
                  <span className="text-sm font-bold text-white">{item.label}</span>
                  <span className={`flex items-center gap-2 text-xs font-black uppercase ${item.ready ? "text-rook-green" : "text-rook-amber"}`}>
                    {item.ready ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    {item.ready ? "ready" : "missing"}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="AI Queue Monitor" eyebrow="Background Processing">
            <div className="space-y-3">
              {queue.slice(0, 8).map((job) => (
                <div key={job.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-black text-white">{job.target}</p>
                    <span className={job.status === "degraded" ? "text-rook-amber" : "text-rook-cyan"}>
                      {job.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-rook-muted">{job.detail}</p>
                  <p className="mt-2 text-xs font-semibold text-rook-muted">
                    {job.kind} · priority {job.priority} · attempts {job.attempts}/{job.max_attempts}
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Panel title="Observability" eyebrow="Monitoring">
            <Metric label="Sentry" enabled={observability.sentryReady} />
            <Metric label="Structured logs" enabled={observability.logFormat === "json"} />
            <Metric label="AI tracing" enabled={observability.aiTracing} />
            <Metric label="Realtime diagnostics" enabled={observability.realtimeDiagnostics} />
          </Panel>
          <Panel title="Insight Engine" eyebrow="Analytics">
            {Object.entries(analytics).map(([key, value]) => (
              <div key={key} className="mb-3 rounded-lg border border-white/10 bg-white/[0.035] p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-rook-muted">{key}</span>
                  <span className="font-black text-white">{value}</span>
                </div>
              </div>
            ))}
          </Panel>
          <Panel title="Entitlements" eyebrow="Monetization Prep">
            <div className="space-y-2">
              {entitlements.map((item) => (
                <div key={item.key} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.035] p-3">
                  <span className="text-sm font-bold text-white">{item.label}</span>
                  <span className="text-xs font-black uppercase text-rook-muted">{item.minimumTier}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </section>
    </>
  );
}

function CompactMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="pulse-shimmer rounded-lg border border-white/10 bg-[linear-gradient(110deg,rgba(255,255,255,0.035),rgba(53,216,255,0.075),rgba(255,255,255,0.035))] p-3">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-rook-muted">{label}</p>
      <p className="mt-2 truncate text-lg font-black text-white">{value}</p>
    </div>
  );
}

function DebugList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-rook-muted">{title}</p>
      <div className="mt-2 space-y-1">
        {items.length === 0 ? (
          <p className="text-xs font-semibold text-rook-muted">{empty}</p>
        ) : (
          items.map((item) => (
            <p key={item} className="truncate text-xs font-semibold text-white">{item}</p>
          ))
        )}
      </div>
    </div>
  );
}

function Panel({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <article className="surface-card rounded-xl p-5">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-rook-cyan">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-black text-white">{title}</h2>
      <div className="mt-5">{children}</div>
    </article>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number }) {
  return (
    <div className="surface-card rounded-xl p-4">
      <div className="flex items-center justify-between gap-3">
        <Icon className="h-5 w-5 text-rook-cyan" />
        <p className="text-xl font-black text-white">{value}</p>
      </div>
      <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-rook-muted">{label}</p>
    </div>
  );
}

function Metric({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="mb-3 flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <span className="text-sm font-bold text-white">{label}</span>
      <span className={`flex items-center gap-2 text-xs font-black uppercase ${enabled ? "text-rook-green" : "text-rook-amber"}`}>
        <Activity className="h-4 w-4" />
        {enabled ? "active" : "standby"}
      </span>
    </div>
  );
}
