export const runtime = "edge";

import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { logAuthEvent } from "@/lib/auth/events";
import { classifyAuthError } from "@/lib/auth/status";
import { generateOperatorProfile } from "@/lib/auth/operator-profile";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const oauthError = requestUrl.searchParams.get("error");
  const oauthErrorDescription = requestUrl.searchParams.get("error_description");
  const next = requestUrl.searchParams.get("next") ?? "/onboarding";
  const destination = next.startsWith("/") ? next : "/onboarding";

  if (oauthError || oauthErrorDescription) {
    const message = oauthErrorDescription ?? oauthError ?? "Auth callback failed.";
    await logAuthEvent({
      eventType: "confirmation_failure",
      status: "failed",
      errorMessage: message,
      metadata: {
        callbackUrl: requestUrl.toString(),
        redirectTarget: destination,
        oauthError,
      },
    });
    return NextResponse.redirect(new URL(`/auth/error?message=${encodeURIComponent(classifyAuthError(message))}`, request.url));
  }

  if (code) {
    const supabase = await createClient();
    console.info("[rook-auth:callback] exchanging confirmation code", {
      redirectTarget: destination,
      hasCode: true,
    });
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      await logAuthEvent({
        eventType: "confirmation_failure",
        status: "failed",
        errorMessage: error.message,
        metadata: { redirectTarget: destination },
      });
      return NextResponse.redirect(new URL(`/auth/error?message=${encodeURIComponent(classifyAuthError(error.message))}`, request.url));
    }

    console.info("[rook-auth:callback] session exchange complete", {
      userId: data.user?.id ?? null,
      email: data.user?.email ?? null,
      sessionPresent: Boolean(data.session),
      redirectTarget: destination,
    });

    if (data.user) {
      await ensureOAuthProfile(supabase, data.user);
    }

    await logAuthEvent({
      eventType: "confirmation_exchange",
      userId: data.user?.id,
      email: data.user?.email,
      status: "ok",
      metadata: {
        sessionPresent: Boolean(data.session),
        redirectTarget: destination,
      },
    });

    return NextResponse.redirect(new URL(destination, request.url));
  }

  await logAuthEvent({
    eventType: "confirmation_failure",
    status: "failed",
    errorMessage: "Missing auth callback code.",
    metadata: { callbackUrl: requestUrl.toString(), redirectTarget: destination },
  });

  return NextResponse.redirect(new URL("/auth/error?message=Missing%20auth%20confirmation%20code.", request.url));
}

async function ensureOAuthProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: User,
) {
  const { data: existing, error: existingError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existingError) {
    console.error("[rook-auth:callback] profile lookup failed", {
      userId: user.id,
      code: existingError.code,
      message: existingError.message,
      details: existingError.details,
      hint: existingError.hint,
    });
    return;
  }

  if (existing) return;

  const metadata = user.user_metadata ?? {};
  const email = user.email ?? `${user.id}@rook.local`;
  const generated = generateOperatorProfile(email);
  const displayName = readString(metadata.full_name) ?? readString(metadata.name) ?? generated.displayName;
  const avatarUrl = readString(metadata.avatar_url) ?? readString(metadata.picture);

  const username = generated.username;
  const fallbackUsername = `${generated.username}_${user.id.slice(0, 6)}`;

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    username,
    display_name: displayName,
    avatar_url: avatarUrl,
    codename: generated.codename,
    avatar_gradient: generated.avatarGradient,
    tactical_specialization: generated.tacticalSpecialization,
    specialization: generated.tacticalSpecialization,
    reputation_score: generated.reputationScore,
    pulse_score: generated.pulseScore,
    alignment: generated.alignment,
    intelligence_category: generated.intelligenceCategory,
    onboarding_completed: false,
    membership_tier: "free",
    membership_status: "inactive",
  });

  if (error) {
    console.error("[rook-auth:callback] profile upsert failed", {
      userId: user.id,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    const fallback = await supabase.from("profiles").upsert({
      id: user.id,
      username: fallbackUsername,
      display_name: displayName,
      avatar_url: avatarUrl,
      onboarding_completed: false,
    });

    if (fallback.error) {
      console.error("[rook-auth:callback] profile fallback upsert failed", {
        userId: user.id,
        code: fallback.error.code,
        message: fallback.error.message,
        details: fallback.error.details,
        hint: fallback.error.hint,
      });
    }
  }
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
