import type { NarrativeRecord } from "@/lib/narratives";

export function DriftPanel({ narrative }: { narrative: NarrativeRecord }) {
  return (
    <div className="surface-card rounded-xl p-5">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-rook-cyan">Consensus Drift</p>
      <h2 className="mt-2 text-xl font-black text-white">Operator stance movement</h2>
      <div className="mt-5 h-48 rounded-lg border border-white/10 bg-rook-void/40 p-3">
        <div className="flex h-full items-end gap-2">
          {narrative.drift.map((point) => (
            <div key={point.label} className="flex h-full flex-1 flex-col justify-end gap-1">
              <Bar value={point.confidence} color="bg-rook-cyan" />
              <Bar value={point.alignment} color="bg-rook-green" />
              <Bar value={point.disagreement} color="bg-rook-amber" />
              <p className="mt-2 text-center text-[10px] font-bold text-rook-muted">{point.label}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Legend label="Confidence" color="bg-rook-cyan" />
        <Legend label="Alignment" color="bg-rook-green" />
        <Legend label="Disagreement" color="bg-rook-amber" />
      </div>
    </div>
  );
}

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex h-1/3 items-end rounded-sm bg-white/[0.035]">
      <div className={`w-full rounded-sm ${color}`} style={{ height: `${Math.max(6, Math.min(100, value))}%` }} />
    </div>
  );
}

function Legend({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] p-2">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      <span className="text-[11px] font-bold text-rook-muted">{label}</span>
    </div>
  );
}
