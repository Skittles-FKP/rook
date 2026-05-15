"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleFollowAction } from "@/app/actions/signals";

export function FollowButton({
  profileId,
  isFollowing,
  isSelf,
}: {
  profileId: string;
  isFollowing: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [following, toggleOptimistic] = useOptimistic(isFollowing, (current) => !current);

  if (isSelf) {
    return null;
  }

  return (
    <button
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          toggleOptimistic(undefined);
          const result = await toggleFollowAction(profileId);
          if (!result.ok) router.refresh();
        })
      }
      className={`focus-ring min-h-11 rounded-lg px-4 text-sm font-black transition disabled:opacity-50 ${
        following
          ? "border border-white/10 bg-white/[0.06] text-white"
          : "bg-white text-rook-void hover:bg-rook-cyan"
      }`}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
