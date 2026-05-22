"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { MessageCircle, Repeat2, ThumbsUp } from "lucide-react";
import { toggleAmplifyAction, toggleLikeAction } from "@/app/actions/signals";

export function SignalActions({
  signalId,
  likes,
  amplifies,
  comments,
  liked,
  amplified,
}: {
  signalId: string;
  likes: number;
  amplifies: number;
  comments: number;
  liked: boolean;
  amplified: boolean;
}) {
  const router = useRouter();
  const persistedSignal = isUuid(signalId);
  const [isPending, startTransition] = useTransition();
  const [state, update] = useOptimistic(
    { likes, amplifies, liked, amplified },
    (
      current,
      action: "like" | "amplify",
    ) => {
      if (action === "like") {
        return {
          ...current,
          liked: !current.liked,
          likes: current.likes + (current.liked ? -1 : 1),
        };
      }

      return {
        ...current,
        amplified: !current.amplified,
        amplifies: current.amplifies + (current.amplified ? -1 : 1),
      };
    },
  );

  return (
    <div className="mt-5 grid grid-cols-3 gap-2 text-xs font-bold text-rook-muted">
      <button
        disabled={isPending || !persistedSignal}
        onClick={() =>
          startTransition(async () => {
            update("like");
            const result = await toggleLikeAction(signalId);
            if (!result.ok) router.refresh();
          })
        }
        className={`focus-ring inline-flex items-center gap-2 rounded-lg py-2 transition hover:text-white ${
          state.liked ? "text-rook-cyan" : ""
        }`}
      >
        <ThumbsUp className="h-4 w-4" />
        {state.likes}
      </button>
      <button
        disabled={isPending || !persistedSignal}
        onClick={() =>
          startTransition(async () => {
            update("amplify");
            const result = await toggleAmplifyAction(signalId);
            if (!result.ok) router.refresh();
          })
        }
        className={`focus-ring inline-flex items-center gap-2 rounded-lg py-2 transition hover:text-white ${
          state.amplified ? "text-rook-violet" : ""
        }`}
      >
        <Repeat2 className="h-4 w-4" />
        {state.amplifies}
      </button>
      <Link href={persistedSignal ? `/signals/${signalId}#comments` : "/feed"} className="focus-ring inline-flex items-center gap-2 rounded-lg py-2 transition hover:text-white">
        <MessageCircle className="h-4 w-4" />
        {comments}
      </Link>
    </div>
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
