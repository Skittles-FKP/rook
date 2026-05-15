"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RadioTower } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function PulseLiveIndicator() {
  const router = useRouter();
  const [events, setEvents] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("rook-pulse-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "signals" }, () => {
        console.info("[realtime:pulse] signals propagation received");
        setEvents((value) => value + 1);
        router.refresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "signal_amplifies" }, () => {
        console.info("[realtime:pulse] signal_amplifies propagation received");
        setEvents((value) => value + 1);
        router.refresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () => {
        console.info("[realtime:pulse] comments propagation received");
        setEvents((value) => value + 1);
        router.refresh();
      })
      .subscribe((status, error) => {
        console.info("[realtime:pulse] subscription state", { status, error });
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return (
    <div className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-rook-green/25 bg-rook-green/10 px-3 text-xs font-black text-rook-green">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rook-green opacity-40" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rook-green" />
      </span>
      <RadioTower className="h-4 w-4" />
      Live Pulse {events > 0 ? `+${events}` : ""}
    </div>
  );
}
