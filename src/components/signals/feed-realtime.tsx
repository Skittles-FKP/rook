"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Radio } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function FeedRealtime() {
  const router = useRouter();
  const [events, setEvents] = useState(0);
  const [latestSource, setLatestSource] = useState("signals");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const refresh = (source: string, payload?: unknown) => {
      console.info("[realtime:feed] propagation received", { source, payload });
      setLatestSource(source);
      setEvents((value) => value + 1);
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
    <button
      type="button"
      disabled={isRefreshing}
      onClick={() => {
        setIsRefreshing(true);
        setEvents(0);
        router.refresh();
        window.setTimeout(() => setIsRefreshing(false), 450);
      }}
      className="rook-live-arrival focus-ring sticky top-16 z-20 mx-auto mt-3 flex max-w-[calc(100%-1rem)] items-center justify-center gap-2 rounded-full border border-rook-cyan/25 bg-rook-void/90 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-rook-cyan shadow-panel backdrop-blur-xl sm:max-w-md"
    >
      <span className="network-pulse grid h-5 w-5 place-items-center rounded-full bg-rook-cyan/10">
        <Radio className="h-3 w-3" />
      </span>
      <span className="min-w-0 truncate">
        {events} live update{events === 1 ? "" : "s"} from {latestSource.replace("_", " ")}
      </span>
    </button>
  );
}
