import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AuthEventType =
  | "signup_attempt"
  | "signup_success"
  | "signup_failure"
  | "signup_pending_confirmation"
  | "verification_resend"
  | "verification_resend_failure"
  | "login_success"
  | "login_failure"
  | "oauth_start"
  | "oauth_failure"
  | "confirmation_exchange"
  | "confirmation_failure"
  | "waitlist_request"
  | "invite_signup";

export async function logAuthEvent({
  eventType,
  email,
  userId,
  provider,
  status = "ok",
  errorMessage,
  metadata = {},
}: {
  eventType: AuthEventType;
  email?: string | null;
  userId?: string | null;
  provider?: string | null;
  status?: "ok" | "failed" | "pending";
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const payload = {
    event_type: eventType,
    email: email?.toLowerCase() || null,
    user_id: userId ?? null,
    provider: provider ?? null,
    status,
    error_message: errorMessage ?? null,
    metadata,
  };

  try {
    const admin = createAdminClient();
    if (admin) {
      await admin.from("auth_events").insert(payload);
      return;
    }

    const supabase = await createClient();
    await supabase.from("auth_events").insert(payload);
  } catch (error) {
    console.error("[rook-auth-event] failed", error);
  }
}
