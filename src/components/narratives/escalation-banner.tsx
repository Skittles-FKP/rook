import { AlertTriangle, RadioTower, UsersRound, Waves } from "lucide-react";
import type { NarrativeEscalation } from "@/lib/narrative-escalation";

export function EscalationBanner({ escalations }: { escalations: NarrativeEscalation[] }) {
  const top = escalations[0];

  if (!top) {
    return (
      <div className="cinematic-escalation rounded-xl border border-white/10 bg-white/[0.035] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-rook-cyan">Network Atmosphere</p>
            <h2 className="mt-2 text-lg font-black text-white">Autonomous intelligence watch active</h2>
          </div>
          <span className="network-pulse h-2.5 w-2.5 rounded-full bg-rook-green" />
        </div>
      </div>
    );
  }

  const critical = top.level === "critical";

  return (
    <div className={`cinematic-escalation rounded-xl border p-4 ${critical ? "border-rook-amber/35 bg-rook-amber/[0.08]" : "border-rook-cyan/25 bg-rook-cyan/[0.07]"}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {critical ? <AlertTriangle className="h-4 w-4 text-rook-amber" /> : <RadioTower className="h-4 w-4 text-rook-cyan" />}
            <p className={`text-xs font-black uppercase tracking-[0.22em] ${critical ? "text-rook-amber" : "text-rook-cyan"}`}>
              {critical ? "Critical Escalation" : "Narrative Accelerating"}
            </p>
          </div>
          <h2 className="mt-2 text-lg font-black text-white">{top.title}</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-rook-muted">{top.recommendedAction}</p>
        </div>
        <div className="grid min-w-56 grid-cols-3 gap-2 text-center">
          <BannerMetric icon={Waves} label="Pulse" value={top.pulseFormation} />
          <BannerMetric icon={AlertTriangle} label="Volatility" value={top.volatility} />
          <BannerMetric icon={UsersRound} label="Operators" value={top.operatorDensity} />
        </div>
      </div>
    </div>
  );
}

function BannerMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-rook-void/45 p-2">
      <Icon className="mx-auto h-4 w-4 text-rook-cyan" />
      <p className="mt-1 text-sm font-black text-white">{value}</p>
      <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-rook-muted">{label}</p>
    </div>
  );
}
