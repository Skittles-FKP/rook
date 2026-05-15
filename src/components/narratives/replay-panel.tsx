import type { NarrativeRecord } from "@/lib/narratives";

export function ReplayPanel({ narrative }: { narrative: NarrativeRecord }) {
  return (
    <div className="surface-card rounded-xl p-5">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-rook-cyan">Historical Playback</p>
      <h2 className="mt-2 text-xl font-black text-white">Graph evolution snapshots</h2>
      <div className="mt-5 grid gap-3">
        {narrative.replay.map((snapshot, index) => (
          <div key={snapshot.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-black text-white">{snapshot.label}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-rook-muted">
                  {snapshot.graph_state}
                </p>
              </div>
              <span className="rounded-full border border-rook-cyan/25 bg-rook-cyan/10 px-3 py-1 text-xs font-black text-rook-cyan">
                frame {index + 1}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Metric label="Pulse" value={snapshot.pulse} />
              <Metric label="Operators" value={snapshot.operators} />
              <Metric label="Signals" value={snapshot.signals} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white/[0.04] p-3">
      <p className="text-lg font-black text-white">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-rook-muted">{label}</p>
    </div>
  );
}
