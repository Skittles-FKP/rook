export const runtime = "edge";

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAuthEvent } from "@/lib/auth/events";
import { classifyAuthError } from "@/lib/auth/status";

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
