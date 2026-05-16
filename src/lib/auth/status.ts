import type { AuthError, Session, User } from "@supabase/supabase-js";
import { getSupabaseEnvDiagnostics } from "@/lib/supabase/env";

export type AuthStatusReport = {
  authEnabled: boolean;
  emailConfirmationLikelyEnabled: boolean;
  redirectUrlValid: boolean;
  sessionCreated: boolean;
  providerHealthy: boolean;
  pendingConfirmation: boolean;
  existingUserLikely: boolean;
  message: string;
  diagnostics: Record<string, unknown>;
};

export function getSignupRedirectUrl(origin: string, next = "/onboarding") {
  const safeOrigin = origin.replace(/\/$/, "");
  const safeNext = next.startsWith("/") ? next : "/onboarding";
  return `${safeOrigin}/auth/callback?next=${encodeURIComponent(safeNext)}`;
}

export function validateSignupAuthStatus({
  user,
  session,
  error,
  redirectTo,
}: {
  user: User | null;
  session: Session | null;
  error: AuthError | Error | null;
  redirectTo: string;
}): AuthStatusReport {
  const env = getSupabaseEnvDiagnostics();
  const redirectUrlValid = isValidHttpUrl(redirectTo);
  const sessionCreated = Boolean(session);
  const pendingConfirmation = Boolean(user && !session);
  const existingUserLikely = Boolean(user && Array.isArray(user.identities) && user.identities.length === 0);
  const authEnabled = env.configured && !error;
  const providerHealthy = authEnabled && redirectUrlValid && !existingUserLikely;
  const emailConfirmationLikelyEnabled = pendingConfirmation;

  return {
    authEnabled,
    emailConfirmationLikelyEnabled,
    redirectUrlValid,
    sessionCreated,
    providerHealthy,
    pendingConfirmation,
    existingUserLikely,
    message: buildAuthStatusMessage({ error, sessionCreated, pendingConfirmation, existingUserLikely }),
    diagnostics: {
      supabaseConfigured: env.configured,
      supabaseHost: env.hostname,
      projectRef: env.projectRef,
      redirectTo,
      userId: user?.id ?? null,
      email: user?.email ?? null,
      emailConfirmedAt: user?.email_confirmed_at ?? null,
      confirmationSentAt: user?.confirmation_sent_at ?? null,
      identityCount: user?.identities?.length ?? null,
      sessionPresent: sessionCreated,
      errorName: error?.name ?? null,
      errorMessage: error?.message ?? null,
    },
  };
}

function buildAuthStatusMessage({
  error,
  sessionCreated,
  pendingConfirmation,
  existingUserLikely,
}: {
  error: AuthError | Error | null;
  sessionCreated: boolean;
  pendingConfirmation: boolean;
  existingUserLikely: boolean;
}) {
  if (error) return classifyAuthError(error.message);
  if (sessionCreated) return "Account created and session started. Routing you into onboarding.";
  if (existingUserLikely) return "This email may already be registered. Try logging in or resend the confirmation email.";
  if (pendingConfirmation) return "Confirmation request accepted. Check your inbox and spam folder for the Supabase verification email.";
  return "Signup did not return a user or session. Check Supabase Auth email provider and confirmation settings.";
}

export function classifyAuthError(message: string) {
  const lower = message.toLowerCase();

  if (lower.includes("email rate limit") || lower.includes("rate limit")) {
    return "Supabase rate-limited email delivery. Wait a minute, then resend verification.";
  }

  if (lower.includes("smtp") || lower.includes("email provider") || lower.includes("provider")) {
    return "Supabase could not send the verification email. Check SMTP or custom email provider settings.";
  }

  if (lower.includes("invalid") && lower.includes("redirect")) {
    return "The email redirect URL is not allowed in Supabase. Add this origin to Auth URL Configuration.";
  }

  if (lower.includes("already registered") || lower.includes("already exists")) {
    return "This email is already registered. Log in or resend the confirmation email.";
  }

  if (message === "fetch failed") {
    return "Cannot reach Supabase. Verify the Supabase URL and anon key for this deployment.";
  }

  return message;
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
