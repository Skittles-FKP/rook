"use client";

import { useEffect, useState } from "react";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { formatRelativeTime } from "@/lib/format";
import type { NarrativeRecord } from "@/lib/narratives";

export function NarrativeTimeline({ narrative }: { narrative: NarrativeRecord }) {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const points = narrative.timeline.length > 0 ? narrative.timeline : [];
  const current = points[active];

  useEffect(() => {
    if (!playing || points.length <= 1) return;
    const timer = window.setTimeout(() => {
      setActive((value) => (value + 1) % points.length);
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [active, playing, points.length]);

  if (!current) {
    return (
      <div className="surface-card rounded-xl p-5 text-sm text-rook-muted">
        Narrative timeline is waiting for linked Signals.
      </div>
    );
  }

  return (
    <div className="surface-card rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-rook-cyan">Narrative Timeline</p>
          <h2 className="mt-2 text-xl font-black text-white">{current.phase}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Control label="Back" onClick={() => setActive((value) => Math.max(0, value - 1))}>
            <SkipBack className="h-4 w-4" />
          </Control>
          <Control label={playing ? "Pause" : "Play"} onClick={() => setPlaying((value) => !value)}>
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Control>
          <Control label="Forward" onClick={() => setActive((value) => Math.min(points.length - 1, value + 1))}>
            <SkipForward className="h-4 w-4" />
          </Control>
        </div>
      </div>
      <div className="mt-5">
        <input
          aria-label="Narrative timeline scrubber"
          type="range"
          min={0}
          max={Math.max(0, points.length - 1)}
          value={active}
          onChange={(event) => setActive(Number(event.target.value))}
          className="w-full accent-rook-cyan"
        />
      </div>
      <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.035] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-black text-white">{current.label}</p>
          <span className="text-xs font-bold text-rook-muted">{formatRelativeTime(current.timestamp)}</span>
        </div>
        <p className="mt-2 text-sm leading-6 text-rook-muted">{current.detail}</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Metric label="Pulse" value={current.pulse_score} />
          <Metric label="Acceleration" value={Math.round(current.acceleration)} />
          <Metric label="Signals" value={current.linked_signal_ids.length} />
        </div>
      </div>
      <div className="mt-5 grid gap-2">
        {points.map((point, index) => (
          <button
            key={point.id}
            type="button"
            onClick={() => setActive(index)}
            className={`focus-ring rounded-lg border px-3 py-2 text-left text-sm transition ${
              index === active
                ? "border-rook-cyan/40 bg-rook-cyan/10 text-white"
                : "border-white/10 bg-white/[0.03] text-rook-muted hover:text-white"
            }`}
          >
            <span className="font-black">{point.phase}</span>
            <span className="ml-2">{point.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Control({ label, children, onClick }: { label: string; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="focus-ring grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.05] text-rook-muted transition hover:text-white"
    >
      {children}
    </button>
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
