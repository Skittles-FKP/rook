import { RadioTower } from "lucide-react";
import { RookBirdIcon } from "@/components/brand";
import { SignalMedia } from "@/components/signals/signal-media";
import { getSignalIntelligence } from "@/lib/intelligence";
import { scorePulseSignal } from "@/lib/pulse";
import type { SignalWithAuthor } from "@/lib/supabase/types";

export function ShareableSignalCard({ signal }: { signal: SignalWithAuthor }) {
  const pulse = scorePulseSignal(signal);
  const intelligence = getSignalIntelligence(pulse);

  return (
    <div className="accent-border min-w-0 rounded-xl bg-rook-graphite p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4 sm:gap-5">
        <div className="flex items-center gap-3">
          <RookBirdIcon className="h-10 w-10" />
          <div>
            <p className="text-sm font-black text-white">Rook Signal Card</p>
            <p className="mt-1 text-xs font-semibold text-rook-muted">
              @{signal.author?.username ?? "unknown"} · {signal.flock?.name ?? "Open Network"}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-rook-green/25 bg-rook-green/10 px-3 py-1 text-xs font-black text-rook-green">
          <RadioTower className="h-3.5 w-3.5" />
          Pulse {pulse.pulse_score}
        </span>
      </div>
      <h3 className="mobile-readable mt-6 text-2xl font-black leading-tight text-white">{signal.title}</h3>
      <p className="mobile-readable mt-3 line-clamp-4 text-sm leading-6 text-rook-muted">{signal.body}</p>
      <SignalMedia signal={signal} />
      <div className="mt-6 grid gap-2 sm:grid-cols-3">
        <Metric label="Confidence" value={`${intelligence.confidence}%`} />
        <Metric label="Velocity" value={`${pulse.velocity}/h`} />
        <Metric label="Sentiment" value={intelligence.sentiment} />
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {intelligence.narrative_tags.map((tag) => (
          <span key={tag} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-rook-muted">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
      <p className="text-sm font-black text-white">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-rook-muted">{label}</p>
    </div>
  );
}
