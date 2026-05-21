import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createInteractionAlert, shouldEmitPulseInteraction } from "@/lib/interactions";
import { getSignalCommentsResult } from "@/lib/data/signals";
import { createClient } from "@/lib/supabase/server";

export const runtime = "edge";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const signalId = decodeURIComponent(id ?? "").trim();

  if (!isUuid(signalId)) {
    return NextResponse.json({
      ok: true,
      comments: [],
      message: "Comments are available for saved Signals only.",
    });
  }

  const result = await getSignalCommentsResult(signalId);
  return NextResponse.json({
    ok: !result.error,
    comments: result.comments,
    message: result.error,
  });
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const signalId = decodeURIComponent(id ?? "").trim();

  if (!isUuid(signalId)) {
    return NextResponse.json({
      ok: false,
      message: "This live preview Signal is not commentable yet.",
    }, { status: 200 });
  }

  let body = "";
  let parentCommentId = "";

  try {
    const payload = await request.json();
    body = typeof payload?.body === "string" ? payload.body.trim() : "";
    parentCommentId = typeof payload?.parentCommentId === "string" ? payload.parentCommentId.trim() : "";
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid comment payload." }, { status: 400 });
  }

  if (!body) {
    return NextResponse.json({ ok: false, message: "Comment text is required." }, { status: 400 });
  }

  if (body.length > 800) {
    return NextResponse.json({ ok: false, message: "Comments must be 800 characters or fewer." }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ ok: false, message: "Log in to comment." }, { status: 401 });
    }

    const { data: signal, error: signalError } = await supabase
      .from("signals")
      .select("id, title, author_id, likes_count, amplifies_count, comments_count")
      .eq("id", signalId)
      .maybeSingle();

    if (signalError) {
      console.error("[api:comments] signal lookup failed", {
        signalId,
        code: signalError.code,
        message: signalError.message,
        details: signalError.details,
        hint: signalError.hint,
      });
      return NextResponse.json({ ok: false, message: "Unable to verify this Signal thread." }, { status: 200 });
    }

    if (!signal) {
      return NextResponse.json({ ok: false, message: "This Signal thread is no longer available." }, { status: 200 });
    }

    if (parentCommentId) {
      const { data: parent, error: parentError } = await supabase
        .from("comments")
        .select("id, signal_id")
        .eq("id", parentCommentId)
        .maybeSingle();

      if (parentError) {
        console.error("[api:comments] parent lookup failed", {
          signalId,
          parentCommentId,
          code: parentError.code,
          message: parentError.message,
          details: parentError.details,
          hint: parentError.hint,
        });
        return NextResponse.json({ ok: false, message: "Unable to verify the reply target. Refresh and try again." }, { status: 200 });
      }

      if (!parent || parent.signal_id !== signalId) {
        return NextResponse.json({ ok: false, message: "This reply target is no longer available." }, { status: 200 });
      }
    }

    const { data: comment, error: insertError } = await supabase
      .from("comments")
      .insert({
        signal_id: signalId,
        author_id: user.id,
        parent_comment_id: parentCommentId || null,
        body,
      })
      .select("*, author:profiles!comments_author_id_fkey(id, username, display_name, avatar_url, operator_type)")
      .single();

    if (insertError) {
      console.error("[api:comments] insert failed", {
        signalId,
        parentCommentId: parentCommentId || null,
        userId: user.id,
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
      });
      return NextResponse.json({ ok: false, message: normalizeCommentError(insertError.message) }, { status: 200 });
    }

    const [{ data: actor }, { data: parent }] = await Promise.all([
      supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
      parentCommentId
        ? supabase.from("comments").select("author_id").eq("id", parentCommentId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    try {
      await createInteractionAlert({
        supabase,
        recipientId: parent?.author_id ?? signal.author_id,
        actorName: actor?.display_name ?? "An operator",
        signal,
        kind: parentCommentId ? "reply" : "comment",
      });

      if (shouldEmitPulseInteraction(signal)) {
        await createInteractionAlert({
          supabase,
          recipientId: signal.author_id,
          actorName: "Pulse Engine",
          signal,
          kind: "pulse",
        });
      }
    } catch (alertError) {
      console.error("[api:comments] alert side effect failed", {
        signalId,
        parentCommentId: parentCommentId || null,
        error: alertError instanceof Error ? alertError.message : String(alertError),
      });
    }

    revalidatePath(`/signals/${signalId}`);
    revalidatePath("/feed");
    revalidatePath("/pulse");
    revalidatePath("/graph");

    return NextResponse.json({ ok: true, message: "Comment added.", comment });
  } catch (error) {
    console.error("[api:comments] unexpected failure", {
      signalId,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : String(error),
    });
    return NextResponse.json({ ok: false, message: "Comment could not be posted. Refresh and try again." }, { status: 200 });
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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
