import type { RadarPoint } from "@/lib/intelligence";

export function PulseRadar({ points }: { points: RadarPoint[] }) {
  return (
    <div className="surface-card pulse-heartbeat rounded-xl p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-rook-cyan">Pulse Radar</p>
          <h2 className="mt-2 text-lg font-black text-white sm:text-xl">Narrative acceleration field</h2>
        </div>
        <span className="rounded-full border border-rook-green/25 bg-rook-green/10 px-3 py-1 text-xs font-black text-rook-green">
          {points.length} clusters
        </span>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(240px,360px)_1fr] lg:gap-5">
        <svg viewBox="0 0 360 360" className="aspect-square w-full max-w-[320px] justify-self-center sm:max-w-[360px]">
          <rect width="360" height="360" rx="12" fill="rgba(255,255,255,0.025)" />
          {[150, 105, 62].map((radius) => (
            <circle key={radius} cx="180" cy="180" r={radius} fill="none" stroke="rgba(255,255,255,0.12)" />
          ))}
          {Array.from({ length: 8 }).map((_, index) => {
            const angle = (Math.PI * 2 * index) / 8;
            return (
              <line
                key={index}
                x1="180"
                y1="180"
                x2={180 + Math.cos(angle) * 150}
                y2={180 + Math.sin(angle) * 150}
                stroke="rgba(255,255,255,0.1)"
              />
            );
          })}
          <circle cx="180" cy="180" r="4" fill="#35d8ff" />
          <circle cx="180" cy="180" r="26" fill="none" stroke="rgba(53,216,255,0.22)" className="pulse-core-ring" />
          {points.map((point) => {
            const angle = (point.angle * Math.PI) / 180;
            const distance = Math.min(148, Math.max(20, point.radius));
            const x = 180 + Math.cos(angle) * distance;
            const y = 180 + Math.sin(angle) * distance;
            return (
              <g key={point.id}>
                <circle cx={x} cy={y} r={10 + Math.min(12, point.score / 18)} fill="rgba(53,216,255,0.14)" className="pulse-node" />
                <circle cx={x} cy={y} r={4 + Math.min(7, point.anomaly)} fill={point.anomaly > 4 ? "#ffbf47" : "#35d8ff"} />
                {point.anomaly > 4 && <circle cx={x} cy={y} r={18 + Math.min(16, point.anomaly)} fill="none" stroke="rgba(255,191,71,0.45)" className="pulse-volatility-ring" />}
              </g>
            );
          })}
        </svg>
        <div className="mobile-scrollbar grid max-h-[360px] content-start gap-3 overflow-y-auto pr-1 sm:max-h-none sm:overflow-visible sm:pr-0">
          {points.slice(0, 6).map((point) => (
            <div key={point.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-black text-white">{point.label}</p>
                <span className="text-xs font-black text-rook-green">+{point.score}</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <MiniMetric label="Accel" value={Math.round(point.acceleration)} />
                <MiniMetric label="Anomaly" value={point.anomaly} />
                <MiniMetric label="Range" value={Math.round(point.radius)} />
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rook-blue via-rook-cyan to-rook-green"
                  style={{ width: `${Math.min(100, Math.max(6, point.score))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-white/[0.04] px-2 py-2">
      <p className="text-sm font-black text-white">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-rook-muted">{label}</p>
    </div>
  );
}
