"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Bell, BrainCircuit, MessageSquare, RadioTower, Repeat2, ThumbsUp, UserPlus } from "lucide-react";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/format";
import type { NetworkEvent } from "@/lib/data/pulse";

const eventIcons = {
  signal: RadioTower,
  amplify: Repeat2,
  comment: MessageSquare,
  pulse: Activity,
  brief: BrainCircuit,
  like: ThumbsUp,
  follow: UserPlus,
  alert: Bell,
};

export function NetworkEventStream({ initialEvents }: { initialEvents: NetworkEvent[] }) {
  const [events, setEvents] = useState(initialEvents);

  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("rook-network-events")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "signals" }, (payload) => {
        const row = payload.new as { id: string; title?: string; created_at?: string };
        console.info("[realtime:network] signal insert propagated", { row });
        setEvents((current) =>
          [
            {
              id: `live-signal-${row.id}`,
              type: "signal",
              label: "Signal published",
              detail: row.title ?? "New Signal entered the network",
              created_at: row.created_at ?? new Date().toISOString(),
            } satisfies NetworkEvent,
            ...current,
          ].slice(0, 12),
        );
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "signal_amplifies" }, (payload) => {
        const row = payload.new as { signal_id: string; created_at?: string };
        console.info("[realtime:network] amplify insert propagated", { row });
        setEvents((current) =>
          [
            {
              id: `live-amplify-${row.signal_id}-${Date.now()}`,
              type: "amplify",
              label: "Operator amplified Signal",
              detail: "Amplification velocity changed",
              created_at: row.created_at ?? new Date().toISOString(),
            } satisfies NetworkEvent,
            ...current,
          ].slice(0, 12),
        );
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "signal_likes" }, (payload) => {
        const row = payload.new as { signal_id: string; created_at?: string };
        console.info("[realtime:network] like insert propagated", { row });
        setEvents((current) =>
          [
            {
              id: `live-like-${row.signal_id}-${Date.now()}`,
              type: "like",
              label: "Operator marked Signal useful",
              detail: "Engagement velocity changed",
              created_at: row.created_at ?? new Date().toISOString(),
            } satisfies NetworkEvent,
            ...current,
          ].slice(0, 12),
        );
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments" }, (payload) => {
        const row = payload.new as { signal_id: string; created_at?: string };
        console.info("[realtime:network] comment insert propagated", { row });
        setEvents((current) =>
          [
            {
              id: `live-comment-${row.signal_id}-${Date.now()}`,
              type: "comment",
              label: "Flock activity detected",
              detail: "Comment velocity changed",
              created_at: row.created_at ?? new Date().toISOString(),
            } satisfies NetworkEvent,
            ...current,
          ].slice(0, 12),
        );
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "follows" }, (payload) => {
        const row = payload.new as { following_id: string; created_at?: string };
        console.info("[realtime:network] follow insert propagated", { row });
        setEvents((current) =>
          [
            {
              id: `live-follow-${row.following_id}-${Date.now()}`,
              type: "follow",
              label: "Operator connection formed",
              detail: "Follow graph changed",
              created_at: row.created_at ?? new Date().toISOString(),
            } satisfies NetworkEvent,
            ...current,
          ].slice(0, 12),
        );
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "operator_alerts" }, (payload) => {
        const row = payload.new as { id: string; title?: string; detail?: string; created_at?: string };
        console.info("[realtime:network] alert insert propagated", { row });
        setEvents((current) =>
          [
            {
              id: `live-alert-${row.id}`,
              type: "alert",
              label: row.title ?? "Operator notification",
              detail: row.detail ?? "Notification routed",
              created_at: row.created_at ?? new Date().toISOString(),
            } satisfies NetworkEvent,
            ...current,
          ].slice(0, 12),
        );
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, (payload) => {
        const row = payload.new as { id: string; display_name?: string; updated_at?: string };
        console.info("[realtime:network] profile update propagated", { row });
        setEvents((current) =>
          [
            {
              id: `live-profile-${row.id}-${Date.now()}`,
              type: "alert",
              label: "Operator identity updated",
              detail: row.display_name ? `${row.display_name} refreshed identity image` : "Profile image propagated",
              created_at: row.updated_at ?? new Date().toISOString(),
            } satisfies NetworkEvent,
            ...current,
          ].slice(0, 12),
        );
      })
      .subscribe((status, error) => {
        console.info("[realtime:network] subscription state", { status, error });
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const visibleEvents = useMemo(() => events.slice(0, 8), [events]);

  return (
    <div className="surface-card mt-4 rounded-xl border-white/[0.07] bg-white/[0.032] p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black text-white">Network Stream</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-rook-muted">Live propagation</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-rook-green/20 bg-rook-green/10 px-2 py-0.5 text-[9px] font-black uppercase text-rook-green">
          <span className="network-pulse h-2 w-2 rounded-full bg-rook-green" />
          Live
        </span>
      </div>
      <div className="mt-3 space-y-2">
        {visibleEvents.length === 0 && (
          <p className="text-sm leading-6 text-rook-muted">Awaiting live network activity.</p>
        )}
        {visibleEvents.map((event, index) => {
          const Icon = eventIcons[event.type];
          const bars = buildMiniBars(event, index);
          const live = Date.now() - new Date(event.created_at).getTime() < 90_000;
          return (
            <div key={event.id} className={clsx("rook-live-arrival network-event-card flex gap-2.5 rounded-lg border p-2.5", live ? "border-rook-cyan/20 bg-rook-cyan/[0.045]" : "border-white/[0.07] bg-white/[0.026]")}>
              <div className="relative grid h-7 w-7 shrink-0 place-items-center rounded-md bg-rook-blue/10 text-rook-cyan">
                {live && <span className="absolute inset-0 rounded-lg border border-rook-cyan/40 animate-ping" />}
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black uppercase tracking-[0.14em] text-white">
                      {event.label}
                    </p>
                    <p className="mt-1 truncate text-xs text-rook-muted">{event.detail}</p>
                  </div>
                  <p className="shrink-0 text-[11px] font-semibold text-rook-muted">
                    {formatRelativeTime(event.created_at)}
                  </p>
                </div>
                <div className="mt-2 flex h-4 items-end gap-1">
                  {bars.map((height, barIndex) => (
                    <span
                      key={`${event.id}-bar-${barIndex}`}
                      className="network-mini-bar flex-1 rounded-t-sm bg-gradient-to-t from-rook-blue/30 via-rook-cyan/65 to-rook-green/80"
                      style={{ height: `${height}%`, animationDelay: `${barIndex * 80}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function buildMiniBars(event: NetworkEvent, index: number) {
  const seed = [...event.id].reduce((total, char) => total + char.charCodeAt(0), index * 17);
  return Array.from({ length: 9 }, (_, barIndex) => 28 + ((seed + barIndex * 19) % 64));
}
