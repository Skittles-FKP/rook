import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { SignalCard } from "@/components/signal-card";
import { CommentForm } from "@/components/signals/comment-form";
import { CommentThread } from "@/components/signals/comment-thread";
import { ShareableSignalCard } from "@/components/signals/shareable-signal-card";
import { getSignalById, getSignalComments } from "@/lib/data/signals";

export default async function SignalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [signal, comments] = await Promise.all([getSignalById(id), getSignalComments(id)]);

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
      <section className="grid gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <SignalCard signal={signal} />
        <ShareableSignalCard signal={signal} />
        <CommentForm signalId={signal.id} />
        <CommentThread signalId={signal.id} initialComments={comments} />
      </section>
    </>
  );
}
