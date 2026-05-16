"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnvDiagnostics } from "@/lib/supabase/env";
import { getSiteUrl } from "@/lib/auth/env";
import { logAuthEvent } from "@/lib/auth/events";
import { generateOperatorProfile } from "@/lib/auth/operator-profile";
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
  const inviteCode = String(formData.get("invite") ?? "").trim();
  const source = String(formData.get("source") ?? "signup").trim();

  if (!email || !password) {
    return { ok: false, message: "Email and password are required." };
  }

  await logAuthEvent({ eventType: "signup_attempt", email, status: "pending", metadata: { inviteCode, source } });

  const generated = generateOperatorProfile(email);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/feed`,
      data: {
        username: generated.username,
        display_name: generated.displayName,
        codename: generated.codename,
        avatar_gradient: generated.avatarGradient,
        tactical_specialization: generated.tacticalSpecialization,
        specialization: generated.tacticalSpecialization,
        reputation_score: generated.reputationScore,
        pulse_score: generated.pulseScore,
        alignment: generated.alignment,
        intelligence_category: generated.intelligenceCategory,
        invite_code: inviteCode || null,
        source,
      },
    },
  });

  if (error) {
    await logAuthEvent({
      eventType: "signup_failure",
      email,
      status: "failed",
      errorMessage: error.message,
      metadata: { inviteCode, source },
    });
    return { ok: false, message: authErrorMessage(error.message) };
  }

  await logAuthEvent({
    eventType: inviteCode ? "invite_signup" : "signup_success",
    email,
    userId: data.user?.id,
    status: data.session ? "ok" : "pending",
    metadata: { inviteCode, source, confirmationSent: !data.session },
  });

  if (data.user && data.session) {
    await supabase.from("profiles").upsert({
      id: data.user.id,
      username: generated.username,
      display_name: generated.displayName,
      codename: generated.codename,
      avatar_gradient: generated.avatarGradient,
      tactical_specialization: generated.tacticalSpecialization,
      specialization: generated.tacticalSpecialization,
      reputation_score: generated.reputationScore,
      pulse_score: generated.pulseScore,
      alignment: generated.alignment,
      intelligence_category: generated.intelligenceCategory,
      invite_code: inviteCode || null,
      onboarding_completed: true,
    });
    revalidatePath("/", "layout");
    redirect("/feed");
  }

  return {
    ok: true,
    message: "Signal received. Check your email to confirm access, then you will route into the feed.",
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
    await logAuthEvent({ eventType: "login_failure", email, status: "failed", errorMessage: error.message });
    return { ok: false, message: authErrorMessage(error.message) };
  }

  await logAuthEvent({ eventType: "login_success", email });
  revalidatePath("/", "layout");
  redirect(next.startsWith("/") ? next : "/feed");
}

export async function oauthAction(formData: FormData) {
  const provider = String(formData.get("provider") ?? "");
  const next = String(formData.get("next") ?? "/feed");

  if (provider !== "google" && provider !== "github") {
    return;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${getSiteUrl()}/auth/callback?next=${encodeURIComponent(next.startsWith("/") ? next : "/feed")}`,
    },
  });

  if (error) {
    await logAuthEvent({ eventType: "oauth_failure", provider, status: "failed", errorMessage: error.message });
    redirect(`/login?error=${encodeURIComponent(authErrorMessage(error.message))}`);
  }

  await logAuthEvent({ eventType: "oauth_start", provider, status: "pending" });

  if (data.url) {
    redirect(data.url);
  }
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
