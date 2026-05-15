"use client";

import { useEffect, useState } from "react";
import { Bell, RadioTower } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/format";
import type { OperatorAlert } from "@/lib/supabase/types";

export function NotificationFeed({ initialAlerts }: { initialAlerts: OperatorAlert[] }) {
  const [alerts, setAlerts] = useState(initialAlerts);

  useEffect(() => {
    setAlerts(initialAlerts);
  }, [initialAlerts]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("rook-operator-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "operator_alerts" }, (payload) => {
        setAlerts((current) => [payload.new as OperatorAlert, ...current].slice(0, 40));
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="surface-card rounded-xl p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-rook-cyan/10 text-rook-cyan">
          <Bell className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-rook-cyan">Realtime Feed</p>
          <h2 className="mt-1 text-xl font-black text-white">Operator notifications</h2>
        </div>
      </div>
      <div className="mt-5 space-y-3">
        {alerts.length === 0 && (
          <p className="rounded-lg border border-white/10 bg-white/[0.035] p-4 text-sm text-rook-muted">
            No routed notifications yet. Likes, amplifies, replies, follows, and Pulse thresholds will appear here.
          </p>
        )}
        {alerts.map((alert) => (
          <article key={alert.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <div className="flex gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-rook-blue/10 text-rook-cyan">
                <RadioTower className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-black text-white">{alert.title}</p>
                <p className="mt-1 text-sm leading-6 text-rook-muted">{alert.detail ?? "Network activity routed."}</p>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-rook-muted">
                  {alert.severity} · {formatRelativeTime(alert.created_at)}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
