"use client";

import { useEffect, useState } from "react";
import { UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LiveRoomPresence({ roomId }: { roomId: string }) {
  const [count, setCount] = useState(1);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`rook-room-${roomId}`, {
      config: { presence: { key: crypto.randomUUID() } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        setCount(Object.keys(channel.presenceState()).length || 1);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomId]);

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-rook-green/25 bg-rook-green/10 px-3 py-1 text-xs font-black text-rook-green">
      <UsersRound className="h-3.5 w-3.5" />
      {count} live
    </span>
  );
}
