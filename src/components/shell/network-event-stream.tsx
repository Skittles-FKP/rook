"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Bell, BrainCircuit, MessageSquare, RadioTower, Repeat2, ThumbsUp, UserPlus } from "lucide-react";
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
    <div className="surface-card mt-5 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-black text-white">Network Stream</p>
        <span className="network-pulse h-2 w-2 rounded-full bg-rook-green" />
      </div>
      <div className="mt-4 space-y-3">
        {visibleEvents.length === 0 && (
          <p className="text-sm leading-6 text-rook-muted">Awaiting live network activity.</p>
        )}
        {visibleEvents.map((event) => {
          const Icon = eventIcons[event.type];
          return (
            <div key={event.id} className="rook-live-arrival flex gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-rook-blue/10 text-rook-cyan">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-white">
                  {event.label}
                </p>
                <p className="mt-1 truncate text-xs text-rook-muted">{event.detail}</p>
                <p className="mt-1 text-[11px] font-semibold text-rook-muted">
                  {formatRelativeTime(event.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
