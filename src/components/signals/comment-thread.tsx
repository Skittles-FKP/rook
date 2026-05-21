"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Reply } from "lucide-react";
import { OperatorAvatar } from "@/components/operator-avatar";
import { VerificationBadge } from "@/components/profile/verification-badge";
import { CommentForm } from "@/components/signals/comment-form";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/format";
import type { NormalizedSignalComment } from "@/lib/data/signals";

type ThreadComment = NormalizedSignalComment;

export function CommentThread({
  signalId,
  initialComments,
  initialError,
}: {
  signalId: string;
  initialComments: ThreadComment[];
  initialError?: string | null;
}) {
  const [comments, setComments] = useState(() => normalizeThreadComments(initialComments, signalId));
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(initialError ?? null);
  const router = useRouter();

  useEffect(() => {
    setComments(normalizeThreadComments(initialComments, signalId));
    setLoadError(initialError ?? null);
  }, [initialComments, initialError, signalId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleCommentCreated(event: Event) {
      const detail = (event as CustomEvent<{ signalId?: string; comment?: ThreadComment }>).detail;
      if (detail?.signalId !== signalId || !detail.comment?.id) return;
      setComments((current) => normalizeThreadComments([...current, detail.comment as ThreadComment], signalId));
      setLoadError(null);
    }

    window.addEventListener("rook:comment-created", handleCommentCreated);
    return () => window.removeEventListener("rook:comment-created", handleCommentCreated);
  }, [signalId]);

  useEffect(() => {
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch (error) {
      console.error("[signal-comments] realtime setup failed", error);
      setLoadError("Realtime comment updates are unavailable. Refresh to retry.");
      return;
    }

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
    const knownIds = new Set(comments.map((comment) => comment.id));

    for (const comment of comments) {
      if (comment.parent_comment_id && knownIds.has(comment.parent_comment_id)) {
        replies.set(comment.parent_comment_id, [...(replies.get(comment.parent_comment_id) ?? []), comment]);
      } else {
        topLevel.push(comment);
      }
    }

    return { roots: topLevel, repliesByParent: replies };
  }, [comments]);

  if (comments.length === 0 && !loadError) {
    return (
      <div className="surface-card rounded-xl p-8 text-center">
        <p className="text-lg font-black text-white">No comments yet</p>
        <p className="mt-2 text-sm text-rook-muted">Add the first response to this Signal.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {loadError && (
        <div className="surface-card rounded-xl border-rook-amber/30 p-4">
          <p className="text-sm font-black text-rook-amber">Comments partially unavailable</p>
          <p className="mt-2 text-sm leading-6 text-rook-muted">{loadError}</p>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="focus-ring mt-3 inline-flex min-h-9 items-center rounded-lg border border-white/10 px-3 text-xs font-black text-white transition hover:border-rook-cyan/40"
          >
            Retry thread
          </button>
        </div>
      )}
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
        <article key={comment.id} className="surface-card min-w-0 overflow-hidden rounded-xl p-3 sm:p-4">
          <CommentBody comment={comment} />
          {comment.malformed && (
            <p className="mt-2 rounded-lg border border-rook-amber/25 bg-rook-amber/10 px-3 py-2 text-xs font-bold text-rook-amber">
              This comment had malformed metadata and was normalized for display.
            </p>
          )}
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
                <div key={reply.id} className="min-w-0 overflow-hidden rounded-lg border border-white/10 bg-white/[0.035] p-3">
                  <CommentBody comment={reply} compact />
                  {reply.malformed && (
                    <p className="mt-2 text-xs font-bold text-rook-amber">Reply metadata was repaired for display.</p>
                  )}
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
  const authorName = comment.author.display_name;

  return (
    <div className="flex min-w-0 gap-2.5 sm:gap-3">
      <OperatorAvatar
        src={comment.author.avatar_url}
        name={authorName}
        operatorType={comment.author.operator_type}
        size={40}
        className="h-9 w-9 sm:h-10 sm:w-10"
      />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <p className="min-w-0 truncate font-bold text-white">{authorName}</p>
          <VerificationBadge subject={comment.author} />
          <p className="min-w-0 max-w-full truncate text-sm text-rook-muted">@{comment.author.username}</p>
          <span className="h-1 w-1 rounded-full bg-rook-muted" />
          <p className="text-sm text-rook-muted">{formatRelativeTime(comment.created_at)}</p>
        </div>
        <p className={`mobile-readable mt-2 text-sm leading-6 text-rook-muted [overflow-wrap:anywhere] ${compact ? "" : "max-w-3xl"}`}>{comment.body}</p>
      </div>
    </div>
  );
}

function normalizeThreadComments(comments: ThreadComment[], signalId: string) {
  return (Array.isArray(comments) ? comments : [])
    .filter((comment): comment is ThreadComment => Boolean(comment?.id))
    .map((comment) => ({
      ...comment,
      signal_id: comment.signal_id || signalId,
      body: typeof comment.body === "string" && comment.body.trim() ? comment.body : "[comment unavailable]",
      created_at: Number.isFinite(new Date(comment.created_at).getTime()) ? comment.created_at : new Date(0).toISOString(),
      author: {
        id: comment.author?.id ?? comment.author_id ?? "unknown",
        username: comment.author?.username ?? "unknown",
        display_name: comment.author?.display_name ?? "Unknown Operator",
        avatar_url: comment.author?.avatar_url ?? null,
        operator_type: comment.author?.operator_type ?? "human",
        verified_operator: Boolean(comment.author?.verified_operator),
        is_verified: Boolean(comment.author?.is_verified || comment.author?.verified_operator),
        is_premium: Boolean(comment.author?.is_premium),
        verification_type: comment.author?.verification_type ?? null,
        membership_tier: comment.author?.membership_tier,
      },
    }))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}
