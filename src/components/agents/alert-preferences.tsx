"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import type { AlertPreference } from "@/lib/agents";

const severityStyles: Record<AlertPreference["severity"], string> = {
  low: "text-rook-muted",
  medium: "text-rook-cyan",
  high: "text-rook-amber",
  critical: "text-red-200",
};

export function AlertPreferences({ preferences }: { preferences: AlertPreference[] }) {
  const [items, setItems] = useState(preferences);

  return (
    <div className="surface-card rounded-xl p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-rook-blue/10 text-rook-cyan">
          <Bell className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-rook-cyan">Alerts</p>
          <h2 className="mt-1 text-xl font-black text-white">Subscription matrix</h2>
        </div>
      </div>
      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <label
            key={item.id}
            className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.035] p-4"
          >
            <span>
              <span className="block text-sm font-black text-white">{item.label}</span>
              <span className={`mt-1 block text-[11px] font-black uppercase tracking-[0.14em] ${severityStyles[item.severity]}`}>
                {item.type} · {item.severity}
              </span>
            </span>
            <input
              type="checkbox"
              checked={item.enabled}
              onChange={() =>
                setItems((current) =>
                  current.map((candidate) =>
                    candidate.id === item.id ? { ...candidate, enabled: !candidate.enabled } : candidate,
                  ),
                )
              }
              className="h-5 w-5 rounded border-white/20 bg-rook-void accent-rook-cyan"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
