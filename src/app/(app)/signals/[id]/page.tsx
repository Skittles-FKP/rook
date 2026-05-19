export const runtime = "edge";

import { notFound } from "next/navigation";
import { ArrowUp, MessageCircle, Share2 } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { SignalCard } from "@/components/signal-card";
import { CommentForm } from "@/components/signals/comment-form";
import { CommentThread } from "@/components/signals/comment-thread";
import { CommentThreadBoundary, SignalErrorBoundary } from "@/components/signals/signal-error-boundary";
import { ShareableSignalCard } from "@/components/signals/shareable-signal-card";
import { getSignalById, getSignalCommentsResult } from "@/lib/data/signals";

const BUILD_ID =
  process.env.CF_PAGES_COMMIT_SHA?.slice(0, 8) ??
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ??
  process.env.NEXT_PUBLIC_ROOK_BUILD_ID ??
  "local";
const BUILD_TIME = process.env.CF_PAGES ? process.env.CF_PAGES_BRANCH ?? "cloudflare" : "local";
const RUNTIME_DIAGNOSTIC_VERSION = "signal-runtime-diagnostics-2026-05-19";

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
    ? {
      comments: Array.isArray(commentsResult.value?.comments) ? commentsResult.value.comments : [],
      error: commentsResult.value?.error ?? null,
    }
    : { comments: [], error: commentsResult.reason instanceof Error ? commentsResult.reason.message : "Unable to load comments." };

  console.info("[signal-detail] route data", {
    signalId: id,
    buildId: BUILD_ID,
    signalStatus: signalResult.status,
    signalFound: Boolean(signal),
    commentsStatus: commentsResult.status,
    commentsCount: commentsPayload.comments.length,
    commentsError: commentsPayload.error,
    signalShape: summarizeSignalShape(signal),
    commentsShape: summarizeCommentsShape(commentsPayload.comments),
    runtimeDiagnosticVersion: RUNTIME_DIAGNOSTIC_VERSION,
    cloudflare: {
      pages: process.env.CF_PAGES ?? null,
      branch: process.env.CF_PAGES_BRANCH ?? null,
      commit: process.env.CF_PAGES_COMMIT_SHA?.slice(0, 8) ?? null,
      deploymentId: process.env.CF_PAGES_DEPLOYMENT_ID ?? null,
    },
    failure: {
      signalReason: signalResult.status === "rejected" ? serializeError(signalResult.reason) : null,
      commentsReason: commentsResult.status === "rejected" ? serializeError(commentsResult.reason) : null,
    },
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
        <SignalErrorBoundary label="Signal detail card">
          <SignalCard signal={signal} />
        </SignalErrorBoundary>
        <SignalErrorBoundary label="Signal share card">
          <ShareableSignalCard signal={signal} />
        </SignalErrorBoundary>
        <CommentThreadBoundary>
          <div id="comments" />
          <CommentForm signalId={signal.id} />
          <CommentThread signalId={signal.id} initialComments={commentsPayload.comments} initialError={commentsPayload.error} />
        </CommentThreadBoundary>
        <p className="px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-rook-muted">
          Build {BUILD_ID} · {BUILD_TIME} · {RUNTIME_DIAGNOSTIC_VERSION}
        </p>
      </section>
      <div className="mobile-safe-bottom fixed inset-x-0 bottom-[4.1rem] z-30 border-t border-white/10 bg-rook-void/90 px-3 py-2 backdrop-blur-2xl md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
          <a href="#comments" className="focus-ring flex min-h-10 items-center justify-center gap-2 rounded-full bg-white text-xs font-black text-rook-void">
            <MessageCircle className="h-4 w-4" />
            Reply
          </a>
          <a href={`/public/signals/${signal.id}`} className="focus-ring flex min-h-10 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.055] text-xs font-black text-rook-muted">
            <Share2 className="h-4 w-4 text-rook-cyan" />
            Share
          </a>
          <a href="#" className="focus-ring flex min-h-10 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.055] text-xs font-black text-rook-muted">
            <ArrowUp className="h-4 w-4 text-rook-cyan" />
            Top
          </a>
        </div>
      </div>
    </>
  );
}

function summarizeSignalShape(signal: unknown) {
  if (!signal || typeof signal !== "object") return { type: typeof signal };
  const row = signal as Record<string, unknown>;
  const author = row.author && typeof row.author === "object" ? row.author as Record<string, unknown> : null;
  const flock = row.flock && typeof row.flock === "object" ? row.flock as Record<string, unknown> : null;

  return {
    keys: Object.keys(row).sort(),
    idType: typeof row.id,
    titleType: typeof row.title,
    bodyType: typeof row.body,
    createdAt: row.created_at,
    counts: {
      likes: row.likes_count,
      amplifies: row.amplifies_count,
      comments: row.comments_count,
    },
    arrays: {
      media_urls: Array.isArray(row.media_urls) ? (row.media_urls as unknown[]).length : typeof row.media_urls,
      attachments: Array.isArray(row.attachments) ? (row.attachments as unknown[]).length : typeof row.attachments,
      ai_narrative_tags: Array.isArray(row.ai_narrative_tags) ? (row.ai_narrative_tags as unknown[]).length : typeof row.ai_narrative_tags,
    },
    media: {
      media_type: row.media_type,
      media_url: row.media_url,
      image_url: row.image_url,
      video_url: row.video_url,
      chart_url: row.chart_url,
      embed_url: row.embed_url,
      reference_url: row.reference_url,
      thumbnail_url: row.thumbnail_url,
    },
    author: author ? {
      keys: Object.keys(author).sort(),
      idType: typeof author.id,
      usernameType: typeof author.username,
      displayNameType: typeof author.display_name,
      operatorType: author.operator_type,
      expertiseDomains: Array.isArray(author.expertise_domains) ? (author.expertise_domains as unknown[]).length : typeof author.expertise_domains,
    } : null,
    flock: flock ? {
      keys: Object.keys(flock).sort(),
      idType: typeof flock.id,
      nameType: typeof flock.name,
      slugType: typeof flock.slug,
    } : null,
  };
}

function summarizeCommentsShape(comments: unknown) {
  if (!Array.isArray(comments)) return { type: typeof comments };
  const ids = new Set<string>();
  const parentIds = new Set<string>();
  let malformed = 0;

  for (const item of comments) {
    if (!item || typeof item !== "object") {
      malformed += 1;
      continue;
    }
    const row = item as Record<string, unknown>;
    if (typeof row.id === "string") ids.add(row.id);
    if (typeof row.parent_comment_id === "string") parentIds.add(row.parent_comment_id);
    if (typeof row.body !== "string" || typeof row.created_at !== "string" || !row.author) malformed += 1;
  }

  return {
    count: comments.length,
    uniqueIds: ids.size,
    parentIds: [...parentIds],
    rootCount: comments.filter((item) => item && typeof item === "object" && !(item as Record<string, unknown>).parent_comment_id).length,
    replyCount: comments.filter((item) => item && typeof item === "object" && Boolean((item as Record<string, unknown>).parent_comment_id)).length,
    malformed,
  };
}

function serializeError(error: unknown) {
  return error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack }
    : String(error);
}
