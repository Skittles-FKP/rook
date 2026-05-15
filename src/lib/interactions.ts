import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, SignalWithAuthor } from "@/lib/supabase/types";

export async function createInteractionAlert({
  supabase,
  recipientId,
  actorName,
  signal,
  kind,
}: {
  supabase: SupabaseClient<Database>;
  recipientId: string | null | undefined;
  actorName: string;
  signal?: Pick<SignalWithAuthor, "id" | "title" | "author_id"> | null;
  kind: "like" | "amplify" | "comment" | "reply" | "follow" | "pulse";
}) {
  if (!recipientId) return;

  const copy: Record<typeof kind, [string, string]> = {
    like: ["Signal liked", `${actorName} marked ${signal?.title ?? "your Signal"} as useful.`],
    amplify: ["Signal amplified", `${actorName} amplified ${signal?.title ?? "your Signal"} into the network.`],
    comment: ["Signal response", `${actorName} added context to ${signal?.title ?? "your Signal"}.`],
    reply: ["Thread reply", `${actorName} replied inside a Signal thread.`],
    follow: ["New follower", `${actorName} started following your operator profile.`],
    pulse: ["Pulse movement", `${signal?.title ?? "A Signal"} crossed a Pulse interaction threshold.`],
  } satisfies Record<typeof kind, [string, string]>;

  const [title, detail] = copy[kind];

  await supabase.from("operator_alerts").insert({
    user_id: recipientId,
    source: kind,
    title,
    detail,
    severity: kind === "pulse" || kind === "amplify" ? "high" : "medium",
  });
}

export function shouldEmitPulseInteraction(signal: Pick<SignalWithAuthor, "likes_count" | "amplifies_count" | "comments_count">) {
  const engagement = signal.likes_count + signal.amplifies_count * 2 + signal.comments_count * 1.5;
  return engagement >= 8 || signal.amplifies_count >= 3 || signal.comments_count >= 4;
}
