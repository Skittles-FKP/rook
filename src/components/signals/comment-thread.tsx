"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Reply } from "lucide-react";
import { OperatorAvatar } from "@/components/operator-avatar";
import { CommentForm } from "@/components/signals/comment-form";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/format";
import type { Comment, Profile } from "@/lib/supabase/types";

type ThreadComment = Comment & {
  author: Pick<Profile, "id" | "username" | "display_name" | "avatar_url" | "operator_type"> | null;
};

export function CommentThread({
  signalId,
  initialComments,
}: {
  signalId: string;
  initialComments: ThreadComment[];
}) {
  const [comments, setComments] = useState(initialComments);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`rook-comments-${signalId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments", filter: `signal_id=eq.${signalId}` },
        () => {
          router.refresh();
        },
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, () => {
        router.refresh();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router, signalId]);

  const { roots, repliesByParent } = useMemo(() => {
    const replies = new Map<string, ThreadComment[]>();
    const topLevel: ThreadComment[] = [];

    for (const comment of comments) {
      if (comment.parent_comment_id) {
        replies.set(comment.parent_comment_id, [...(replies.get(comment.parent_comment_id) ?? []), comment]);
      } else {
        topLevel.push(comment);
      }
    }

    return { roots: topLevel, repliesByParent: replies };
  }, [comments]);

  if (comments.length === 0) {
    return (
      <div className="surface-card rounded-xl p-8 text-center">
        <p className="text-lg font-black text-white">No comments yet</p>
        <p className="mt-2 text-sm text-rook-muted">Add the first response to this Signal.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="surface-card rounded-xl p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-rook-cyan" />
            <p className="text-sm font-black text-white">Signal Thread</p>
          </div>
          <span className="text-xs font-black uppercase tracking-[0.14em] text-rook-muted">
            {comments.length} entries
          </span>
        </div>
      </div>
      {roots.map((comment) => (
        <article key={comment.id} className="surface-card rounded-xl p-3 sm:p-4">
          <CommentBody comment={comment} />
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => setReplyingTo((current) => (current === comment.id ? null : comment.id))}
              className="focus-ring inline-flex min-h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs font-black text-rook-muted transition hover:text-white"
            >
              <Reply className="h-3.5 w-3.5" />
              Reply
            </button>
          </div>
          {replyingTo === comment.id && (
            <div className="mt-3">
              <CommentForm signalId={signalId} parentCommentId={comment.id} compact />
            </div>
          )}
          {(repliesByParent.get(comment.id) ?? []).length > 0 && (
            <div className="mt-4 space-y-3 border-l border-rook-cyan/20 pl-3 sm:pl-4">
              {(repliesByParent.get(comment.id) ?? []).map((reply) => (
                <div key={reply.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                  <CommentBody comment={reply} compact />
                </div>
              ))}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

function CommentBody({ comment, compact = false }: { comment: ThreadComment; compact?: boolean }) {
  const authorName = comment.author?.display_name ?? "Unknown Operator";

  return (
    <div className="flex gap-2.5 sm:gap-3">
      <OperatorAvatar
        src={comment.author?.avatar_url}
        name={authorName}
        operatorType={comment.author?.operator_type}
        size={40}
        className="h-9 w-9 sm:h-10 sm:w-10"
      />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-bold text-white">{authorName}</p>
          <p className="text-sm text-rook-muted">@{comment.author?.username ?? "unknown"}</p>
          <span className="h-1 w-1 rounded-full bg-rook-muted" />
          <p className="text-sm text-rook-muted">{formatRelativeTime(comment.created_at)}</p>
        </div>
        <p className={`mobile-readable mt-2 text-sm leading-6 text-rook-muted ${compact ? "" : "max-w-3xl"}`}>{comment.body}</p>
      </div>
    </div>
  );
}
