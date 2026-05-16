export const runtime = "edge";

import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { SignalCard } from "@/components/signal-card";
import { CommentForm } from "@/components/signals/comment-form";
import { CommentThread } from "@/components/signals/comment-thread";
import { CommentThreadBoundary, SignalErrorBoundary } from "@/components/signals/signal-error-boundary";
import { ShareableSignalCard } from "@/components/signals/shareable-signal-card";
import { getSignalById, getSignalCommentsResult } from "@/lib/data/signals";

export default async function SignalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [signalResult, commentsResult] = await Promise.allSettled([
    getSignalById(id),
    getSignalCommentsResult(id),
  ]);
  const signal = signalResult.status === "fulfilled" ? signalResult.value : null;
  const commentsPayload = commentsResult.status === "fulfilled"
    ? commentsResult.value
    : { comments: [], error: commentsResult.reason instanceof Error ? commentsResult.reason.message : "Unable to load comments." };

  console.info("[signal-detail] route data", {
    signalId: id,
    signalStatus: signalResult.status,
    signalFound: Boolean(signal),
    commentsStatus: commentsResult.status,
    commentsCount: commentsPayload.comments.length,
    commentsError: commentsPayload.error,
  });

  if (!signal) {
    notFound();
  }

  return (
    <>
      <PageHeader
        eyebrow="Signal Detail"
        title="Signal trail"
        description="Inspect the Signal, its amplification, and the conversation around it."
      />
      <section className="mx-auto grid w-full max-w-4xl min-w-0 gap-4 overflow-x-clip px-3 py-5 sm:px-6 lg:px-8">
        <SignalErrorBoundary label="Signal card">
          <SignalCard signal={signal} />
        </SignalErrorBoundary>
        <SignalErrorBoundary label="Share card">
          <ShareableSignalCard signal={signal} />
        </SignalErrorBoundary>
        <CommentThreadBoundary>
          <CommentForm signalId={signal.id} />
          <CommentThread signalId={signal.id} initialComments={commentsPayload.comments} initialError={commentsPayload.error} />
        </CommentThreadBoundary>
      </section>
    </>
  );
}
