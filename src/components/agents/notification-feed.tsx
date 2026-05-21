"use client";

import { useEffect, useState } from "react";
import { Bell, MessageSquare, RadioTower, Repeat2, Rocket, UserPlus, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/format";
import type { OperatorAlert } from "@/lib/supabase/types";

export function NotificationFeed({ initialAlerts }: { initialAlerts: OperatorAlert[] }) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const unread = alerts.filter((alert) => !alert.read_at).length;

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
    <div className="surface-card overflow-hidden rounded-xl p-4 sm:p-5">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-rook-cyan/10 text-rook-cyan">
          <Bell className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-rook-cyan">Realtime Feed</p>
          <h2 className="mt-1 text-xl font-black text-white">Operator notifications</h2>
        </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-rook-green/20 bg-rook-green/10 px-2.5 py-1 text-xs font-black text-rook-green">
          <span className="network-pulse h-2 w-2 rounded-full bg-rook-green" />
          {unread} unread
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <NotificationMetric icon={MessageSquare} label="Replies" value={alerts.filter((alert) => /reply|comment/i.test(alert.title)).length} />
        <NotificationMetric icon={Repeat2} label="Signals" value={alerts.filter((alert) => /signal|ampl/i.test(alert.title)).length} />
        <NotificationMetric icon={UserPlus} label="Follows" value={alerts.filter((alert) => /follow/i.test(alert.title)).length} />
        <NotificationMetric icon={Zap} label="Pulse" value={alerts.filter((alert) => /pulse|spike|narrative/i.test(alert.title)).length} />
      </div>
      <div className="mt-5 space-y-3">
        {alerts.length === 0 && (
          <p className="rounded-lg border border-white/10 bg-white/[0.035] p-4 text-sm text-rook-muted">
            No routed notifications yet. Likes, amplifies, replies, follows, and Pulse thresholds will appear here.
          </p>
        )}
        {alerts.map((alert) => (
          <article key={alert.id} className="rook-live-arrival min-w-0 overflow-hidden rounded-lg border border-white/10 bg-white/[0.035] p-3 transition active:scale-[0.99] sm:p-4">
            <div className="flex gap-3">
              <div className="relative grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-rook-blue/10 text-rook-cyan">
                {!alert.read_at && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-rook-green shadow-[0_0_14px_rgba(46,232,159,0.8)]" />}
                {getAlertIcon(alert.title)}
              </div>
              <div className="min-w-0 flex-1">
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

function getAlertIcon(title: string) {
  if (/launch|app/i.test(title)) return <Rocket className="h-4 w-4" />;
  if (/follow/i.test(title)) return <UserPlus className="h-4 w-4" />;
  if (/reply|comment/i.test(title)) return <MessageSquare className="h-4 w-4" />;
  if (/ampl|signal/i.test(title)) return <Repeat2 className="h-4 w-4" />;
  return <RadioTower className="h-4 w-4" />;
}

function NotificationMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-2 text-center">
      <Icon className="mx-auto h-4 w-4 text-rook-cyan" />
      <p className="mt-1 text-sm font-black text-white">{value}</p>
      <p className="mt-0.5 truncate text-[9px] font-black uppercase tracking-[0.08em] text-rook-muted">{label}</p>
    </div>
  );
}
