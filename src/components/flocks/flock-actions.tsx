"use client";

import { useTransition } from "react";
import { toggleFlockMembershipAction } from "@/app/actions/signals";

export function FlockMembershipButton({
  flockId,
  joined,
}: {
  flockId: string;
  joined: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(async () => void (await toggleFlockMembershipAction(flockId)))}
      className={`focus-ring min-h-10 rounded-lg px-3 text-sm font-black transition disabled:opacity-50 ${
        joined
          ? "border border-white/10 bg-white/[0.06] text-white"
          : "bg-white text-rook-void hover:bg-rook-cyan"
      }`}
    >
      {joined ? "Joined" : "Join"}
    </button>
  );
}
