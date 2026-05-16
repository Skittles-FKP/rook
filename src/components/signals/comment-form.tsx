"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCommentAction } from "@/app/actions/signals";
import { SubmitButton } from "@/components/form/submit-button";
import { createClient } from "@/lib/supabase/client";
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
      const supabase = createClient();
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id ?? null;

      console.info("signal-comments:client-submit auth state", {
        signalId: targetSignalId,
        parentCommentId: targetParentId || null,
        hasSession: Boolean(sessionData.session),
        hasAccessToken: Boolean(sessionData.session?.access_token),
        userId,
        sessionError: sessionError?.message ?? null,
        origin: window.location.origin,
        supabaseHost: process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : null,
      });

      if (sessionError || !userId) {
        const fallback = await createCommentAction({ ok: false, message: "" }, formData);
        console.info("signal-comments:server-action-fallback", {
          signalId: targetSignalId,
          parentCommentId: targetParentId || null,
          ok: fallback.ok,
          message: fallback.message,
        });
        setState(fallback);
        return;
      }

      if (targetParentId) {
        const { data: parent, error: parentError } = await supabase
          .from("comments")
          .select("id, signal_id")
          .eq("id", targetParentId)
          .maybeSingle();

        if (parentError) {
          console.error("signal-comments:client-submit parent lookup failed", {
            signalId: targetSignalId,
            parentCommentId: targetParentId,
            code: parentError.code,
            message: parentError.message,
            details: parentError.details,
            hint: parentError.hint,
          });
          setState({ ok: false, message: "Unable to verify the reply target. Refresh and try again." });
          return;
        }

        if (!parent || parent.signal_id !== targetSignalId) {
          setState({ ok: false, message: "This reply target is no longer available." });
          return;
        }
      }

      const payload = {
        signal_id: targetSignalId,
        author_id: userId,
        parent_comment_id: targetParentId || null,
        body,
      };

      const { data, error } = await supabase
        .from("comments")
        .insert(payload)
        .select("*, author:profiles!comments_author_id_fkey(id, username, display_name, avatar_url, operator_type)")
        .single();
      const insertedComment = data as Record<string, unknown> | null;

      if (error) {
        console.error("signal-comments:client-submit insert failed", {
          signalId: targetSignalId,
          parentCommentId: targetParentId || null,
          userId,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        setState({ ok: false, message: normalizeCommentError(error.message) });
        return;
      }

      console.info("signal-comments:client-submit inserted", {
        signalId: targetSignalId,
        parentCommentId: targetParentId || null,
        commentId: insertedComment?.id ?? null,
        authorPresent: Boolean(insertedComment?.author),
      });

      formRef.current?.reset();
      setState({ ok: true, message: targetParentId ? "Reply added." : "Comment added." });
      window.dispatchEvent(new CustomEvent("rook:comment-created", { detail: { signalId: targetSignalId, comment: insertedComment } }));
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
