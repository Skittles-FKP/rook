export const runtime = "edge";

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAuthEvent } from "@/lib/auth/events";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/feed";
  const destination = next.startsWith("/") ? next : "/feed";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      await logAuthEvent({
        eventType: "confirmation_failure",
        status: "failed",
        errorMessage: error.message,
      });
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url));
    }

    await logAuthEvent({
      eventType: "confirmation_exchange",
      userId: data.user?.id,
      email: data.user?.email,
      status: "ok",
    });
  }

  return NextResponse.redirect(new URL(destination, request.url));
}
