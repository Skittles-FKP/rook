"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/format";
import { createInteractionAlert, shouldEmitPulseInteraction } from "@/lib/interactions";
import { detectMediaUrl, inferSignalVisualMode, uploadMediaFile, validateMediaFile, type SignalMediaType } from "@/lib/media";
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
  const markdownEnabled = String(formData.get("markdownEnabled") ?? "") === "on";
  const signalCategory = normalizeCategory(String(formData.get("signalCategory") ?? "").trim());
  const tagInput = String(formData.get("tags") ?? "").trim();
  const appName = String(formData.get("appName") ?? "").trim();
  const appUrl = String(formData.get("appUrl") ?? "").trim();
  const appStackInput = String(formData.get("appStackTags") ?? "").trim();
  const mediaFiles = formData.getAll("mediaFile").filter((value): value is File => value instanceof File && value.size > 0);
  const appLogoFile = formData.get("appLogoFile");
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
  let appLogoUrl: string | null = null;
  const mediaUrls = new Set<string>();
  const attachments: Array<Record<string, unknown>> = [];
  const tags = parseTagList(tagInput).slice(0, 10);
  const appStackTags = parseTagList(appStackInput).slice(0, 10);

  if (appLogoFile instanceof File && appLogoFile.size > 0) {
    const logoValidation = validateMediaFile(appLogoFile);
    if (!logoValidation.ok || logoValidation.mediaType !== "image") {
      return { ok: false, message: logoValidation.ok ? "AI app logos must be JPG, PNG, or WebP image files." : logoValidation.message };
    }
    const logoUpload = await uploadMediaFile(supabase, userId, appLogoFile);
    if (!logoUpload.ok) {
      return { ok: false, message: `App logo upload failed: ${logoUpload.message}` };
    }
    appLogoUrl = logoUpload.publicUrl;
    mediaMetadata = {
      ...mediaMetadata,
      appLogoStoragePath: logoUpload.path,
      appLogoBucket: logoUpload.bucket,
    };
  }

  for (const mediaFile of mediaFiles.slice(0, 6)) {
    const upload = await uploadMediaFile(supabase, userId, mediaFile);
    if (!upload.ok) {
      return { ok: false, message: upload.message };
    }

    uploadedMediaUrl ??= upload.publicUrl;
    const validatedMediaType = upload.mediaType as SignalMediaType;
    if (attachments.length === 0) {
      uploadedMediaType = aiGenerated && validatedMediaType === "image" ? "ai_generated" : validatedMediaType;
    }
    const attachment = {
      type: aiGenerated && validatedMediaType === "image" ? "ai_generated" : validatedMediaType,
      url: upload.publicUrl,
      width: null,
      height: null,
      name: mediaFile.name,
      media_url: upload.publicUrl,
      thumbnail_url: upload.thumbnailUrl,
      storagePath: upload.path,
      bucket: upload.bucket,
      contentType: mediaFile.type,
      size: mediaFile.size,
      originalName: mediaFile.name,
      aiGenerated,
    };
    attachments.push(attachment);
    mediaUrls.add(upload.publicUrl);
    mediaMetadata = {
      ...mediaMetadata,
      primaryStoragePath: attachments[0]?.storagePath,
      uploadCount: attachments.length,
    };
  }

  if (uploadedMediaUrl) {
    mediaDetection = {
      mediaType: uploadedMediaType,
      mediaUrl: uploadedMediaUrl,
      embedUrl: null,
      thumbnailUrl: typeof attachments[0]?.thumbnail_url === "string" ? attachments[0].thumbnail_url : null,
      metadata: mediaMetadata,
    };
  }

  const finalMediaUrl = (uploadedMediaUrl ?? mediaDetection.mediaUrl) || null;
  if (finalMediaUrl) mediaUrls.add(finalMediaUrl);
  if (imageUrl) mediaUrls.add(imageUrl);
  if (chartUrl) mediaUrls.add(chartUrl);
  if (embedUrl) mediaUrls.add(embedUrl);
  if (referenceUrl) mediaUrls.add(referenceUrl);

  const ogTarget = finalMediaUrl && ["link", "youtube", "x_post"].includes(mediaDetection.mediaType ?? "")
    ? finalMediaUrl
    : referenceUrl || null;
  const og = ogTarget ? await fetchOgMetadata(ogTarget) : { ogTitle: null, ogDescription: null, ogImage: null };

  if (mediaUrlInput && finalMediaUrl && attachments.length === 0) {
    attachments.push({
      type: mediaDetection.mediaType,
      url: finalMediaUrl,
      width: null,
      height: null,
      name: og.ogTitle ?? getFilenameFromUrl(finalMediaUrl) ?? "Signal media",
      media_url: finalMediaUrl,
      thumbnail_url: mediaDetection.thumbnailUrl ?? og.ogImage,
      embed_url: mediaDetection.embedUrl,
      title: og.ogTitle,
      description: og.ogDescription,
      metadata: mediaDetection.metadata,
    });
  }

  const coverImage = imageUrl || (mediaDetection.mediaType === "image" || mediaDetection.mediaType === "ai_generated" ? finalMediaUrl : null) || og.ogImage;
  const thumbnail = mediaDetection.thumbnailUrl ?? og.ogImage ?? coverImage;
  const visualMode = inferSignalVisualMode({
    title,
    body,
    ai_narrative_tags: [],
  });
  const media = attachments.length > 0
    ? attachments
    : [...mediaUrls].map((url) => {
      const detected = detectMediaUrl(url, aiGenerated);
      return {
        type: detected.mediaType,
        url,
        width: null,
        height: null,
        name: url === ogTarget ? og.ogTitle ?? getFilenameFromUrl(url) : getFilenameFromUrl(url),
        media_url: url,
        thumbnail_url: detected.thumbnailUrl ?? (url === ogTarget ? og.ogImage : null),
        embed_url: detected.embedUrl,
        title: url === ogTarget ? og.ogTitle : null,
        description: url === ogTarget ? og.ogDescription : null,
        metadata: detected.metadata,
      };
    });

  const payload = {
    author_id: userId,
    title,
    body,
    flock_id: flockId || null,
    cover_image: coverImage,
    thumbnail,
    media,
    visual_mode: visualMode,
    image_url: imageUrl || (mediaDetection.mediaType === "image" || mediaDetection.mediaType === "ai_generated" ? finalMediaUrl : null),
    video_url: mediaDetection.mediaType === "video" ? finalMediaUrl : null,
    reference_url: referenceUrl || (mediaDetection.mediaType === "link" ? finalMediaUrl : null),
    chart_url: chartUrl || (mediaDetection.mediaType === "chart" ? finalMediaUrl : null),
    embed_url: embedUrl || mediaDetection.embedUrl || (mediaDetection.mediaType === "youtube" || mediaDetection.mediaType === "x_post" ? finalMediaUrl : null),
    media_type: mediaDetection.mediaType,
    media_url: finalMediaUrl,
    media_urls: [...mediaUrls],
    attachments,
    thumbnail_url: thumbnail,
    og_title: og.ogTitle,
    og_description: og.ogDescription,
    og_image: og.ogImage,
    media_metadata: mediaMetadata,
    signal_category: signalCategory,
    tags,
    categories: signalCategory ? [signalCategory] : [],
    app_name: appName || null,
    app_url: appUrl || null,
    app_logo_url: appLogoUrl,
    app_stack_tags: appStackTags,
    markdown_enabled: markdownEnabled,
  };

  const { error } = await supabase.from("signals").insert(payload);

  if (error) {
    console.error("[signals:create] rich insert failed", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      hasUpload: mediaFiles.length > 0,
      mediaUrl: finalMediaUrl,
      mediaType: mediaDetection.mediaType,
    });

    const compatibility = await insertSignalCompatibilityFallback({
      supabase,
      payload,
      userId,
      title,
      body,
      flockId: flockId || null,
      finalMediaUrl,
      mediaType: mediaDetection.mediaType,
      thumbnail,
      coverImage,
      imageUrl: payload.image_url,
      referenceUrl: payload.reference_url,
      chartUrl: payload.chart_url,
      embedUrl: payload.embed_url,
      videoUrl: payload.video_url,
      og,
      originalError: error,
    });

    if (!compatibility.ok) {
      return { ok: false, message: compatibility.message };
    }

    if (compatibility.degraded) {
      console.warn("[signals:create] published with compatibility media payload", {
        omittedColumns: compatibility.omittedColumns,
        originalError: error.message,
        mediaUrl: finalMediaUrl,
      });
    }
  }

  revalidatePath("/feed");
  revalidatePath("/graph");
  revalidatePath("/pulse");
  return { ok: true, message: "Signal published." };
}

async function insertSignalCompatibilityFallback({
  body,
  chartUrl,
  coverImage,
  embedUrl,
  finalMediaUrl,
  flockId,
  imageUrl,
  mediaType,
  og,
  originalError,
  payload,
  referenceUrl,
  supabase,
  thumbnail,
  title,
  userId,
  videoUrl,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  payload: Record<string, unknown>;
  userId: string;
  title: string;
  body: string;
  flockId: string | null;
  finalMediaUrl: string | null;
  mediaType: SignalMediaType | null;
  thumbnail: string | null;
  coverImage: string | null;
  imageUrl: string | null;
  referenceUrl: string | null;
  chartUrl: string | null;
  embedUrl: string | null;
  videoUrl: string | null;
  og: { ogTitle: string | null; ogDescription: string | null; ogImage: string | null };
  originalError: { message: string };
}) {
  const compatibilityPayload = {
    author_id: userId,
    title,
    body,
    flock_id: flockId,
    cover_image: coverImage,
    thumbnail,
    image_url: imageUrl,
    video_url: videoUrl,
    reference_url: referenceUrl,
    chart_url: chartUrl,
    embed_url: embedUrl,
    media_type: mediaType,
    media_url: finalMediaUrl,
    thumbnail_url: thumbnail,
    og_title: og.ogTitle,
    og_description: og.ogDescription,
    og_image: og.ogImage,
  };

  const compatibility = await supabase.from("signals").insert(compatibilityPayload);
  if (!compatibility.error) {
    return {
      ok: true as const,
      degraded: true,
      omittedColumns: ["attachments", "media", "media_urls", "media_metadata"],
    };
  }

  console.error("[signals:create] compatibility insert failed", {
    message: compatibility.error.message,
    code: compatibility.error.code,
    details: compatibility.error.details,
    hint: compatibility.error.hint,
    hadMedia: Boolean(finalMediaUrl),
  });

  const legacyPayload = {
    author_id: userId,
    title,
    body,
    flock_id: flockId,
    image_url: imageUrl ?? (mediaType === "image" || mediaType === "ai_generated" ? finalMediaUrl : null),
    reference_url: referenceUrl ?? (mediaType === "link" ? finalMediaUrl : null),
  };
  const legacy = await supabase.from("signals").insert(legacyPayload);

  if (!legacy.error) {
    return {
      ok: true as const,
      degraded: true,
      omittedColumns: Object.keys(payload).filter((key) => !(key in legacyPayload)),
    };
  }

  if (finalMediaUrl) {
    return {
      ok: false as const,
      message: `Media uploaded but the Signal could not be saved. First error: ${originalError.message}. Fallback error: ${compatibility.error.message}.`,
    };
  }

  return { ok: false as const, message: legacy.error.message };
}

function parseTagList(value: string) {
  return value
    .split(/[,#\n]/)
    .map((tag) => tag.trim().replace(/^#/, ""))
    .filter((tag) => tag.length > 0 && tag.length <= 32)
    .map((tag) => tag.toLowerCase())
    .filter((tag, index, tags) => tags.indexOf(tag) === index);
}

function normalizeCategory(value: string) {
  const allowed = new Set(["Launch", "Research", "Benchmark", "Infrastructure", "Funding", "Agent", "Security", "Governance"]);
  return allowed.has(value) ? value : null;
}

function getFilenameFromUrl(value: string) {
  try {
    const name = new URL(value).pathname.split("/").filter(Boolean).pop();
    return name ? decodeURIComponent(name) : null;
  } catch {
    return null;
  }
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

  if (parentCommentId) {
    const { data: parent, error: parentError } = await supabase
      .from("comments")
      .select("id, signal_id")
      .eq("id", parentCommentId)
      .maybeSingle();

    if (parentError) {
      console.error("[signal-comments] parent lookup failed", {
        signalId,
        parentCommentId,
        message: parentError.message,
      });
      return { ok: false, message: "Unable to verify the reply target. Refresh and try again." };
    }

    if (!parent || parent.signal_id !== signalId) {
      return { ok: false, message: "This reply target is no longer available." };
    }
  }

  const { error } = await supabase.from("comments").insert({
    signal_id: signalId,
    author_id: userId,
    parent_comment_id: parentCommentId || null,
    body,
  });

  if (error) {
    console.error("[signal-comments] insert failed", {
      signalId,
      parentCommentId: parentCommentId || null,
      userId,
      message: error.message,
    });
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

  try {
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
  } catch (alertError) {
    console.error("[signal-comments] alert side effect failed", {
      signalId,
      parentCommentId: parentCommentId || null,
      error: alertError instanceof Error ? alertError.message : String(alertError),
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
