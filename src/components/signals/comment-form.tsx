"use client";

import { useActionState } from "react";
import { createCommentAction } from "@/app/actions/signals";
import { SubmitButton } from "@/components/form/submit-button";
import type { ActionState } from "@/app/actions/auth";

const initialState: ActionState = { ok: false, message: "" };

export function CommentForm({
  signalId,
  parentCommentId,
  compact = false,
}: {
  signalId: string;
  parentCommentId?: string;
  compact?: boolean;
}) {
  const [state, action] = useActionState(createCommentAction, initialState);

  return (
    <form action={action} className={compact ? "rounded-lg border border-white/10 bg-white/[0.035] p-3" : "surface-card rounded-xl p-4"}>
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
        <SubmitButton pendingLabel="Posting...">{parentCommentId ? "Reply" : "Comment"}</SubmitButton>
      </div>
    </form>
  );
}
