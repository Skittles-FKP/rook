import { Activity, AlertTriangle, BrainCircuit, GitBranch, ShieldCheck } from "lucide-react";
import { getSignalIntelligence } from "@/lib/intelligence";
import { scorePulseSignal } from "@/lib/pulse";
import { deriveSignalContinuity } from "@/lib/signal-continuity";
import type { SignalWithAuthor } from "@/lib/supabase/types";

export function SignalIntelligencePanel({ signal }: { signal: SignalWithAuthor }) {
  const intelligence = getSignalIntelligence(signal);
  const continuity = deriveSignalContinuity(signal, scorePulseSignal(signal));

  return (
    <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <IntelMetric icon={ShieldCheck} label="Confidence" value={intelligence.confidence} suffix="%" />
        <IntelMetric icon={AlertTriangle} label="Contradiction" value={intelligence.contradiction_score} suffix="%" />
        <IntelMetric icon={Activity} label="Sentiment" value={intelligence.sentiment} />
        <IntelMetric icon={GitBranch} label="Narrative" value={continuity.state} />
        <div className="rounded-lg bg-white/[0.04] p-3">
          <div className="flex items-center gap-2 text-rook-cyan">
            <BrainCircuit className="h-4 w-4" />
            <p className="text-[10px] font-black uppercase tracking-[0.14em]">Tags</p>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(intelligence.narrative_tags.length > 0 ? intelligence.narrative_tags : ["unclassified"]).map((tag) => (
              <span key={tag} className="rounded-full bg-rook-blue/10 px-2 py-1 text-[10px] font-bold text-rook-cyan">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex h-12 items-end gap-1 rounded-lg bg-rook-void/40 px-2 py-2">
        {intelligence.velocity_history.map((value, index) => (
          <div
            key={`${value}-${index}`}
            className="flex-1 rounded-sm bg-gradient-to-t from-rook-blue to-rook-green"
            style={{ height: `${Math.max(8, Math.min(100, value * 20 + 8))}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function IntelMetric({
  icon: Icon,
  label,
  value,
  suffix = "",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  suffix?: string;
}) {
  return (
    <div className="rounded-lg bg-white/[0.04] p-3">
      <div className="flex items-center gap-2 text-rook-cyan">
        <Icon className="h-4 w-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.14em]">{label}</p>
      </div>
      <p className="mt-2 text-sm font-black text-white">
        {value}
        {typeof value === "number" ? suffix : ""}
      </p>
    </div>
  );
}
