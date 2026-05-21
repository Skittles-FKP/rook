"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SubmitButton } from "@/components/form/submit-button";
import type { ActionState } from "@/app/actions/auth";

type CommentSubmitState = ActionState & {
  pending?: boolean;
};

export function CommentForm({
  signalId,
  parentCommentId,
  compact = false,
}: {
  signalId: string;
  parentCommentId?: string;
  compact?: boolean;
}) {
  const [state, setState] = useState<CommentSubmitState>({ ok: false, message: "" });
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  async function submitComment(formData: FormData) {
    const body = String(formData.get("body") ?? "").trim();
    const targetSignalId = String(formData.get("signalId") ?? "").trim();
    const targetParentId = String(formData.get("parentCommentId") ?? "").trim();

    if (!targetSignalId || !body) {
      setState({ ok: false, message: "Comment text is required." });
      return;
    }

    setState({ ok: false, message: "Posting...", pending: true });

    try {
      const response = await fetch(`/api/signals/${encodeURIComponent(targetSignalId)}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          body,
          parentCommentId: targetParentId || null,
        }),
      });

      const payload = await response.json().catch(() => null) as {
        ok?: boolean;
        message?: string;
        comment?: Record<string, unknown>;
      } | null;

      if (!response.ok || !payload?.ok || !payload.comment) {
        console.error("signal-comments:client-submit insert failed", {
          signalId: targetSignalId,
          parentCommentId: targetParentId || null,
          status: response.status,
          message: payload?.message ?? null,
        });
        setState({ ok: false, message: normalizeCommentError(payload?.message ?? response.statusText) });
        return;
      }

      console.info("signal-comments:client-submit inserted", {
        signalId: targetSignalId,
        parentCommentId: targetParentId || null,
        commentId: payload.comment.id ?? null,
        authorPresent: Boolean(payload.comment.author),
      });

      formRef.current?.reset();
      setState({ ok: true, message: targetParentId ? "Reply added." : "Comment added." });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("rook:comment-created", { detail: { signalId: targetSignalId, comment: payload.comment } }));
      }
      startTransition(() => router.refresh());
    } catch (error) {
      console.error("signal-comments:client-submit unexpected failure", {
        signalId: targetSignalId,
        parentCommentId: targetParentId || null,
        error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : String(error),
      });
      setState({ ok: false, message: "Comment could not be posted. Refresh and try again." });
    }
  }

  return (
    <form ref={formRef} action={submitComment} className={compact ? "rounded-lg border border-white/10 bg-white/[0.035] p-3" : "surface-card rounded-xl p-4"}>
      <input type="hidden" name="signalId" value={signalId} />
      {parentCommentId && <input type="hidden" name="parentCommentId" value={parentCommentId} />}
      <textarea
        required
        name="body"
        rows={compact ? 2 : 3}
        maxLength={800}
        placeholder={parentCommentId ? "Reply with context or a correction." : "Add context, evidence, or a counter-signal."}
        className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.05] px-3 py-3 text-sm leading-6 text-white outline-none transition focus:border-rook-blue"
      />
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {state.message ? (
          <p className={`text-sm ${state.ok ? "text-rook-green" : "text-red-200"}`}>
            {state.message}
          </p>
        ) : (
          <p className="text-sm text-rook-muted">{parentCommentId ? "Replies stay attached to this thread." : "Comments become part of the Signal trail."}</p>
        )}
        <SubmitButton pendingLabel="Posting..." disabled={Boolean(state.pending) || isPending}>
          {parentCommentId ? "Reply" : "Comment"}
        </SubmitButton>
      </div>
    </form>
  );
}

function normalizeCommentError(message: string) {
  if (/row-level security|violates row-level security|permission denied/i.test(message)) {
    return "Rook could not verify your production session. Sign out, sign back in, and retry.";
  }

  if (/parent_comment_id|column/i.test(message)) {
    return "Comment replies are waiting on the production database migration.";
  }

  return message || "Comment could not be posted.";
}
