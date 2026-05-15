"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnvDiagnostics } from "@/lib/supabase/env";
import {
  OPERATOR_AVATAR_BUCKET,
  OPERATOR_AVATAR_MAX_BYTES,
  extractOperatorAvatarPath,
  isAllowedOperatorAvatarType,
  operatorAvatarPath,
} from "@/lib/avatar";
import { normaliseUsername } from "@/lib/format";

export type ActionState = {
  ok: boolean;
  message: string;
};

function authErrorMessage(message: string) {
  if (message !== "fetch failed") {
    return message;
  }

  const diagnostics = getSupabaseEnvDiagnostics();
  const hostname = diagnostics.hostname ?? "the configured Supabase host";

  return `Cannot reach Supabase at ${hostname}. Verify NEXT_PUBLIC_SUPABASE_URL in .env.local matches the Project URL from Supabase.`;
}

export async function signUpAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const username = normaliseUsername(String(formData.get("username") ?? ""));
  const displayName = String(formData.get("displayName") ?? "").trim();

  if (!email || !password || !username || !displayName) {
    return { ok: false, message: "Email, password, username, and display name are required." };
  }

  if (username.length < 3) {
    return { ok: false, message: "Username must be at least 3 characters." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        display_name: displayName,
      },
    },
  });

  if (error) {
    return { ok: false, message: authErrorMessage(error.message) };
  }

  if (data.user && data.session) {
    await supabase.from("profiles").upsert({
      id: data.user.id,
      username,
      display_name: displayName,
      onboarding_completed: false,
    });
    revalidatePath("/", "layout");
    redirect("/onboarding");
  }

  return {
    ok: true,
    message: "Check your email to confirm your Rook account, then log in.",
  };
}

export async function loginAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/feed");

  if (!email || !password) {
    return { ok: false, message: "Email and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { ok: false, message: authErrorMessage(error.message) };
  }

  revalidatePath("/", "layout");
  redirect(next.startsWith("/") ? next : "/feed");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function onboardingAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const username = normaliseUsername(String(formData.get("username") ?? ""));
  const displayName = String(formData.get("displayName") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const avatarUrl = String(formData.get("avatarUrl") ?? "").trim();
  const operatorType = String(formData.get("operatorType") ?? "").trim();
  const expertiseDomains = formData.getAll("expertise").map(String).filter(Boolean);
  const pulseTopics = formData.getAll("pulseTopics").map(String).filter(Boolean);
  const aiInterests = formData.getAll("aiInterests").map(String).filter(Boolean);

  if (!username || !displayName) {
    return { ok: false, message: "Username and display name are required." };
  }

  if (username.length < 3) {
    return { ok: false, message: "Username must be at least 3 characters." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, message: "Your session expired. Log in again." };
  }

  const enrichedBio = [
    bio,
    operatorType ? `Operator type: ${operatorType}.` : "",
    pulseTopics.length > 0 ? `Pulse focus: ${pulseTopics.join(", ")}.` : "",
    aiInterests.length > 0 ? `AI calibration: ${aiInterests.join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const { error } = await supabase
    .from("profiles")
    .update({
      username,
      display_name: displayName,
      bio: enrichedBio || null,
      avatar_url: avatarUrl || null,
      expertise_domains: expertiseDomains,
      onboarding_completed: true,
    })
    .eq("id", user.id);

  if (error) {
    const fallback = await supabase
      .from("profiles")
      .update({
        username,
        display_name: displayName,
        bio: enrichedBio || null,
        avatar_url: avatarUrl || null,
        onboarding_completed: true,
      })
      .eq("id", user.id);

    if (fallback.error) {
      return { ok: false, message: fallback.error.message };
    }
  }

  revalidatePath("/", "layout");
  redirect("/feed");
}

function avatarValidationMessage(file: File) {
  if (file.size <= 0) {
    return "Select an image before uploading.";
  }

  if (file.size > OPERATOR_AVATAR_MAX_BYTES) {
    return "Profile images must be 2 MB or smaller.";
  }

  if (!isAllowedOperatorAvatarType(file.type)) {
    return "Use a JPG, PNG, WebP, or GIF image.";
  }

  return null;
}

function revalidateProfileSurfaces(username?: string | null) {
  revalidatePath("/", "layout");
  revalidatePath("/feed");
  revalidatePath("/pulse");
  revalidatePath("/graph");
  revalidatePath("/operators");
  revalidatePath("/profile");
  if (username) {
    revalidatePath(`/profile/${username}`);
  }
}

export async function updateProfileAvatarAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const file = formData.get("avatar");

  if (!(file instanceof File)) {
    return { ok: false, message: "Select an image before uploading." };
  }

  const validationMessage = avatarValidationMessage(file);
  if (validationMessage) {
    return { ok: false, message: validationMessage };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, message: "Your session expired. Log in again." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const path = operatorAvatarPath(user.id, file.type);
  const { error: uploadError } = await supabase.storage
    .from(OPERATOR_AVATAR_BUCKET)
    .upload(path, file, {
      cacheControl: "31536000",
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return { ok: false, message: uploadError.message };
  }

  const { data: publicUrl } = supabase.storage.from(OPERATOR_AVATAR_BUCKET).getPublicUrl(path);
  const avatarUrl = publicUrl.publicUrl;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);

  if (updateError) {
    await supabase.storage.from(OPERATOR_AVATAR_BUCKET).remove([path]);
    return { ok: false, message: updateError.message };
  }

  const previousPath = extractOperatorAvatarPath(profile?.avatar_url);
  if (previousPath && previousPath.startsWith(`${user.id}/`) && previousPath !== path) {
    await supabase.storage.from(OPERATOR_AVATAR_BUCKET).remove([previousPath]);
  }

  revalidateProfileSurfaces(profile?.username);
  return { ok: true, message: "Operator image updated." };
}

export async function removeProfileAvatarAction(
  _state: ActionState,
  _formData?: FormData,
): Promise<ActionState> {
  void _state;
  void _formData;

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, message: "Your session expired. Log in again." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", user.id);

  if (error) {
    return { ok: false, message: error.message };
  }

  const previousPath = extractOperatorAvatarPath(profile?.avatar_url);
  if (previousPath && previousPath.startsWith(`${user.id}/`)) {
    await supabase.storage.from(OPERATOR_AVATAR_BUCKET).remove([previousPath]);
  }

  revalidateProfileSurfaces(profile?.username);
  return { ok: true, message: "Operator image removed." };
}
