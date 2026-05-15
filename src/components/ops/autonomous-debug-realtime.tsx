"use client";

import { useEffect, useState } from "react";
import { RadioTower } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function AutonomousDebugRealtime() {
  const [events, setEvents] = useState(0);
  const [state, setState] = useState("connecting");
  const [latest, setLatest] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("rook-ops-autonomous-debug")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "signals" }, (payload) => {
        const row = payload.new as { id?: string; title?: string; created_at?: string };
        console.info("[ops-debug:realtime] signal insert received", { row });
        setEvents((value) => value + 1);
        setLatest(row.title ?? row.id ?? row.created_at ?? "Signal insert received");
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "operator_alerts" }, (payload) => {
        console.info("[ops-debug:realtime] operator alert received", { row: payload.new });
        setEvents((value) => value + 1);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "signal_amplifies" }, (payload) => {
        console.info("[ops-debug:realtime] amplification received", { row: payload.new });
        setEvents((value) => value + 1);
      })
      .subscribe((status, error) => {
        console.info("[ops-debug:realtime] subscription state", { status, error });
        setState(status);
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="rounded-lg border border-rook-green/20 bg-rook-green/10 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-rook-green">Realtime Events Received</p>
        <RadioTower className="h-4 w-4 text-rook-green" />
      </div>
      <p className="mt-2 text-lg font-black text-white">{events}</p>
      <p className="mt-1 text-xs font-semibold text-rook-muted">State: {state}</p>
      {latest && <p className="mt-2 truncate text-xs font-semibold text-rook-muted">{latest}</p>}
    </div>
  );
}
