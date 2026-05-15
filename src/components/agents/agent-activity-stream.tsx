"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, BrainCircuit, RadioTower } from "lucide-react";
import { formatRelativeTime } from "@/lib/format";
import type { AgentActivity } from "@/lib/agents";

const severityStyles: Record<AgentActivity["severity"], string> = {
  low: "border-white/10 bg-white/[0.035] text-rook-muted",
  medium: "border-rook-cyan/20 bg-rook-cyan/10 text-rook-cyan",
  high: "border-rook-amber/25 bg-rook-amber/10 text-rook-amber",
  critical: "border-red-400/30 bg-red-400/10 text-red-200",
};

export function AgentActivityStream({ activity }: { activity: AgentActivity[] }) {
  const [heartbeat, setHeartbeat] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setHeartbeat((value) => value + 1), 14000);
    return () => window.clearInterval(timer);
  }, []);

  const visible = useMemo(() => activity.slice(0, 8), [activity]);

  return (
    <div className="surface-card rounded-xl p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-rook-cyan">Agent Activity</p>
          <h2 className="mt-2 text-xl font-black text-white">Autonomous monitoring stream</h2>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-rook-green/25 bg-rook-green/10 px-3 py-1 text-xs font-black uppercase text-rook-green">
          <span className="h-2 w-2 rounded-full bg-rook-green shadow-[0_0_16px_rgba(46,232,159,0.75)]" />
          live {heartbeat}
        </div>
      </div>
      <div className="mt-5 space-y-3">
        {visible.map((item, index) => {
          const Icon = item.severity === "high" || item.severity === "critical"
            ? AlertTriangle
            : item.label.includes("Brief")
              ? BrainCircuit
              : item.label.includes("monitoring")
                ? RadioTower
                : Activity;

          return (
            <article key={item.id} className={`rounded-lg border p-4 ${severityStyles[item.severity]}`}>
              <div className="flex gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-rook-void/55 text-current">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-black text-white">{item.label}</h3>
                    <span className="text-[10px] font-black uppercase tracking-[0.14em] text-current">
                      {item.severity}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-rook-muted">{item.detail}</p>
                  <p className="mt-2 text-[11px] font-semibold text-rook-muted">
                    {formatRelativeTime(item.created_at)} · trace {index + 1}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
