"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function FeedRealtime() {
  const router = useRouter();
  const [events, setEvents] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    const refresh = (source: string, payload?: unknown) => {
      console.info("[realtime:feed] propagation received", { source, payload });
      setEvents((value) => value + 1);
      router.refresh();
    };
    const channel = supabase
      .channel("rook-feed-signals")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "signals" },
        (payload) => refresh("signals", payload),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "signal_likes" }, (payload) => refresh("signal_likes", payload))
      .on("postgres_changes", { event: "*", schema: "public", table: "signal_amplifies" }, (payload) => refresh("signal_amplifies", payload))
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, (payload) => refresh("comments", payload))
      .subscribe((status, error) => {
        console.info("[realtime:feed] subscription state", { status, error });
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router]);

  if (events === 0) return null;

  return (
    <div className="rook-live-arrival sticky top-16 z-20 mx-4 mt-3 rounded-lg border border-rook-cyan/20 bg-rook-cyan/10 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-rook-cyan backdrop-blur sm:mx-6 lg:mx-8">
      New intelligence received · Pulse synchronized · graph ripple queued
    </div>
  );
}
