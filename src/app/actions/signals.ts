"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/format";
import { createInteractionAlert, shouldEmitPulseInteraction } from "@/lib/interactions";
import { detectMediaUrl, uploadMediaFile, type SignalMediaType } from "@/lib/media";
import { fetchOgMetadata } from "@/lib/og";
import { checkActionRateLimit, scoreSignalAbuseRisk } from "@/lib/security";
import type { ActionState } from "@/app/actions/auth";

async function getUserId() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, userId: null };
  }

  return { supabase, userId: user.id };
}

export async function createSignalAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const flockId = String(formData.get("flockId") ?? "").trim();
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  const referenceUrl = String(formData.get("referenceUrl") ?? "").trim();
  const chartUrl = String(formData.get("chartUrl") ?? "").trim();
  const embedUrl = String(formData.get("embedUrl") ?? "").trim();
  const mediaUrlInput = String(formData.get("mediaUrl") ?? "").trim();
  const aiGenerated = String(formData.get("aiGenerated") ?? "") === "on";
  const mediaFile = formData.get("mediaFile");
  const { supabase, userId } = await getUserId();

  if (!userId) {
    return { ok: false, message: "Log in to publish a Signal." };
  }

  if (title.length < 4 || body.length < 1) {
    return { ok: false, message: "Signals need a title and body." };
  }

  if (!checkActionRateLimit(`signal:${userId}`, 8, 10 * 60 * 1000)) {
    return { ok: false, message: "Signal publishing is throttled. Try again shortly." };
  }

  const abuse = scoreSignalAbuseRisk({
    title,
    body,
    urls: [imageUrl, referenceUrl, chartUrl, embedUrl, mediaUrlInput],
  });

  if (abuse.risk >= 75) {
    return { ok: false, message: `Signal held by quality controls: ${abuse.flags.join(", ")}.` };
  }

  let mediaDetection = detectMediaUrl(mediaUrlInput || imageUrl || chartUrl || embedUrl || referenceUrl, aiGenerated);
  let uploadedMediaUrl: string | null = null;
  let uploadedMediaType = mediaDetection.mediaType;
  let mediaMetadata: Record<string, unknown> = { ...mediaDetection.metadata };

  if (mediaFile instanceof File && mediaFile.size > 0) {
    const upload = await uploadMediaFile(supabase, userId, mediaFile);
    if (!upload.ok) {
      return { ok: false, message: upload.message };
    }

    uploadedMediaUrl = upload.publicUrl;
    const validatedMediaType = upload.mediaType as SignalMediaType;
    uploadedMediaType = aiGenerated && validatedMediaType === "image" ? "ai_generated" : validatedMediaType;
    mediaMetadata = {
      ...mediaMetadata,
      storagePath: upload.path,
      contentType: mediaFile.type,
      size: mediaFile.size,
      originalName: mediaFile.name,
      aiGenerated,
    };
    mediaDetection = {
      mediaType: uploadedMediaType,
      mediaUrl: uploadedMediaUrl,
      embedUrl: null,
      thumbnailUrl: upload.thumbnailUrl,
      metadata: mediaMetadata,
    };
  }

  const finalMediaUrl = (uploadedMediaUrl ?? mediaDetection.mediaUrl) || null;
  const shouldFetchOg = finalMediaUrl && ["link", "youtube", "x_post"].includes(mediaDetection.mediaType ?? "");
  const og = shouldFetchOg ? await fetchOgMetadata(finalMediaUrl) : { ogTitle: null, ogDescription: null, ogImage: null };

  const payload = {
    author_id: userId,
    title,
    body,
    flock_id: flockId || null,
    image_url: imageUrl || (mediaDetection.mediaType === "image" || mediaDetection.mediaType === "ai_generated" ? finalMediaUrl : null),
    reference_url: referenceUrl || (mediaDetection.mediaType === "link" ? finalMediaUrl : null),
    chart_url: chartUrl || (mediaDetection.mediaType === "chart" ? finalMediaUrl : null),
    embed_url: embedUrl || mediaDetection.embedUrl || (mediaDetection.mediaType === "youtube" || mediaDetection.mediaType === "x_post" ? finalMediaUrl : null),
    media_type: mediaDetection.mediaType,
    media_url: finalMediaUrl,
    thumbnail_url: mediaDetection.thumbnailUrl ?? og.ogImage,
    og_title: og.ogTitle,
    og_description: og.ogDescription,
    og_image: og.ogImage,
    media_metadata: mediaMetadata,
  };

  const { error } = await supabase.from("signals").insert(payload);

  if (error) {
    const fallback = await supabase.from("signals").insert({
      author_id: userId,
      title,
      body,
      flock_id: flockId || null,
    });

    if (fallback.error) {
      return { ok: false, message: fallback.error.message };
    }
  }

  revalidatePath("/feed");
  revalidatePath("/graph");
  revalidatePath("/pulse");
  return { ok: true, message: "Signal published." };
}

export async function toggleLikeAction(signalId: string) {
  const { supabase, userId } = await getUserId();

  if (!userId) {
    return { ok: false, message: "Log in to like Signals." };
  }

  const { data } = await supabase
    .from("signal_likes")
    .select("signal_id")
    .eq("signal_id", signalId)
    .eq("user_id", userId)
    .maybeSingle();

  const result = data
    ? await supabase
        .from("signal_likes")
        .delete()
        .eq("signal_id", signalId)
        .eq("user_id", userId)
    : await supabase.from("signal_likes").insert({ signal_id: signalId, user_id: userId });

  if (result.error) {
    return { ok: false, message: result.error.message };
  }

  if (!data) {
    const { data: signal } = await supabase
      .from("signals")
      .select("id, title, author_id, likes_count, amplifies_count, comments_count")
      .eq("id", signalId)
      .maybeSingle();
    const { data: actor } = await supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle();

    await createInteractionAlert({
      supabase,
      recipientId: signal?.author_id,
      actorName: actor?.display_name ?? "An operator",
      signal,
      kind: "like",
    });

    if (signal && shouldEmitPulseInteraction(signal)) {
      await createInteractionAlert({
        supabase,
        recipientId: signal.author_id,
        actorName: "Pulse Engine",
        signal,
        kind: "pulse",
      });
    }
  }

  revalidatePath("/feed");
  revalidatePath("/pulse");
  revalidatePath("/graph");
  revalidatePath(`/signals/${signalId}`);
  return { ok: true, message: data ? "Like removed." : "Signal liked." };
}

export async function toggleAmplifyAction(signalId: string) {
  const { supabase, userId } = await getUserId();

  if (!userId) {
    return { ok: false, message: "Log in to amplify Signals." };
  }

  const { data } = await supabase
    .from("signal_amplifies")
    .select("signal_id")
    .eq("signal_id", signalId)
    .eq("user_id", userId)
    .maybeSingle();

  const result = data
    ? await supabase
        .from("signal_amplifies")
        .delete()
        .eq("signal_id", signalId)
        .eq("user_id", userId)
    : await supabase.from("signal_amplifies").insert({ signal_id: signalId, user_id: userId });

  if (result.error) {
    return { ok: false, message: result.error.message };
  }

  if (!data) {
    const { data: signal } = await supabase
      .from("signals")
      .select("id, title, author_id, likes_count, amplifies_count, comments_count")
      .eq("id", signalId)
      .maybeSingle();
    const { data: actor } = await supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle();

    await createInteractionAlert({
      supabase,
      recipientId: signal?.author_id,
      actorName: actor?.display_name ?? "An operator",
      signal,
      kind: "amplify",
    });

    if (signal && shouldEmitPulseInteraction(signal)) {
      await createInteractionAlert({
        supabase,
        recipientId: signal.author_id,
        actorName: "Pulse Engine",
        signal,
        kind: "pulse",
      });
    }
  }

  revalidatePath("/feed");
  revalidatePath("/pulse");
  revalidatePath("/graph");
  revalidatePath(`/signals/${signalId}`);
  return { ok: true, message: data ? "Amplify removed." : "Signal amplified." };
}

export async function createCommentAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const signalId = String(formData.get("signalId") ?? "");
  const parentCommentId = String(formData.get("parentCommentId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const { supabase, userId } = await getUserId();

  if (!userId) {
    return { ok: false, message: "Log in to comment." };
  }

  if (!signalId || !body) {
    return { ok: false, message: "Comment text is required." };
  }

  const { error } = await supabase.from("comments").insert({
    signal_id: signalId,
    author_id: userId,
    parent_comment_id: parentCommentId || null,
    body,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  const [{ data: signal }, { data: actor }, { data: parent }] = await Promise.all([
    supabase
      .from("signals")
      .select("id, title, author_id, likes_count, amplifies_count, comments_count")
      .eq("id", signalId)
      .maybeSingle(),
    supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
    parentCommentId
      ? supabase.from("comments").select("author_id").eq("id", parentCommentId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  await createInteractionAlert({
    supabase,
    recipientId: parent?.author_id ?? signal?.author_id,
    actorName: actor?.display_name ?? "An operator",
    signal,
    kind: parentCommentId ? "reply" : "comment",
  });

  if (signal && shouldEmitPulseInteraction(signal)) {
    await createInteractionAlert({
      supabase,
      recipientId: signal.author_id,
      actorName: "Pulse Engine",
      signal,
      kind: "pulse",
    });
  }

  revalidatePath(`/signals/${signalId}`);
  revalidatePath("/feed");
  revalidatePath("/pulse");
  revalidatePath("/graph");
  return { ok: true, message: "Comment added." };
}

export async function toggleFollowAction(profileId: string) {
  const { supabase, userId } = await getUserId();

  if (!userId) {
    return { ok: false, message: "Log in to follow operators." };
  }

  if (profileId === userId) {
    return { ok: false, message: "You cannot follow yourself." };
  }

  const { data } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId)
    .eq("following_id", profileId)
    .maybeSingle();

  const result = data
    ? await supabase
        .from("follows")
        .delete()
        .eq("follower_id", userId)
        .eq("following_id", profileId)
    : await supabase.from("follows").insert({ follower_id: userId, following_id: profileId });

  if (result.error) {
    return { ok: false, message: result.error.message };
  }

  if (!data) {
    const { data: actor } = await supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle();
    await createInteractionAlert({
      supabase,
      recipientId: profileId,
      actorName: actor?.display_name ?? "An operator",
      kind: "follow",
    });
  }

  revalidatePath("/profile");
  revalidatePath(`/profile/${profileId}`);
  return { ok: true, message: data ? "Follow removed." : "Following operator." };
}

export async function createFlockAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const { supabase, userId } = await getUserId();

  if (!userId) {
    return { ok: false, message: "Log in to create a Flock." };
  }

  if (name.length < 3) {
    return { ok: false, message: "Flock name must be at least 3 characters." };
  }

  const slug = slugify(name);
  const { data, error } = await supabase
    .from("flocks")
    .insert({ name, slug, description: description || null, created_by: userId })
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: error.message };
  }

  await supabase.from("flock_members").insert({
    flock_id: data.id,
    user_id: userId,
    role: "owner",
  });

  revalidatePath("/flocks");
  return { ok: true, message: "Flock created." };
}

export async function toggleFlockMembershipAction(flockId: string) {
  const { supabase, userId } = await getUserId();

  if (!userId) {
    return { ok: false, message: "Log in to join Flocks." };
  }

  const { data } = await supabase
    .from("flock_members")
    .select("flock_id")
    .eq("flock_id", flockId)
    .eq("user_id", userId)
    .maybeSingle();

  const result = data
    ? await supabase.from("flock_members").delete().eq("flock_id", flockId).eq("user_id", userId)
    : await supabase.from("flock_members").insert({ flock_id: flockId, user_id: userId });

  if (result.error) {
    return { ok: false, message: result.error.message };
  }

  revalidatePath("/flocks");
  return { ok: true, message: data ? "Left Flock." : "Joined Flock." };
}
