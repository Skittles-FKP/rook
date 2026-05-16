"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { Github, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { loginAction, logSignupDiagnosticAction, oauthAction, signUpAction, type ActionState } from "@/app/actions/auth";
import { SubmitButton } from "@/components/form/submit-button";
import { createClient } from "@/lib/supabase/client";
import { generateOperatorProfile } from "@/lib/auth/operator-profile";
import { getSignupRedirectUrl, validateSignupAuthStatus } from "@/lib/auth/status";

const initialState: ActionState = { ok: false, message: "" };

export function AuthForm({
  mode,
  next = "/feed",
  invite = "",
}: {
  mode: "login" | "signup";
  next?: string;
  invite?: string;
}) {
  const [state, action] = useActionState(mode === "login" ? loginAction : signUpAction, initialState);
  const [signupState, setSignupState] = useState<ActionState>(initialState);
  const [signupPending, setSignupPending] = useState(false);
  const [lastEmail, setLastEmail] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [resendPending, setResendPending] = useState(false);
  const clientRedirectTo = useMemo(
    () => typeof window === "undefined" ? "" : getSignupRedirectUrl(window.location.origin, "/onboarding"),
    [],
  );
  const visibleState = mode === "signup" ? signupState : state;

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function handleSignupSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (mode !== "signup") return;
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const inviteCode = String(form.get("invite") ?? "").trim();
    const source = String(form.get("source") ?? "signup").trim();
    const redirectTo = getSignupRedirectUrl(window.location.origin, "/onboarding");

    if (!email || !password) {
      setSignupState({ ok: false, message: "Email and password are required." });
      return;
    }

    setSignupPending(true);
    setSignupState(initialState);
    setLastEmail(email);

    const generated = generateOperatorProfile(email);
    const supabase = createClient();

    console.info("[rook-auth:signup] starting", {
      email,
      redirectTo,
      origin: window.location.origin,
      source,
      inviteCodePresent: Boolean(inviteCode),
    });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
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

    const report = validateSignupAuthStatus({
      user: data.user,
      session: data.session,
      error,
      redirectTo,
    });

    console.info("[rook-auth:signup] response", {
      authResponse: {
        userId: data.user?.id ?? null,
        email: data.user?.email ?? email,
        sessionPresent: Boolean(data.session),
        identityCount: data.user?.identities?.length ?? null,
      },
      emailConfirmationState: {
        pendingConfirmation: report.pendingConfirmation,
        confirmationSentAt: data.user?.confirmation_sent_at ?? null,
        emailConfirmedAt: data.user?.email_confirmed_at ?? null,
      },
      redirectTarget: redirectTo,
      sessionPresence: Boolean(data.session),
      error: error ? { name: error.name, message: error.message, status: error.status } : null,
    });

    await logSignupDiagnosticAction({
      eventType: error
        ? "signup_failure"
        : report.sessionCreated
          ? "signup_success"
          : "signup_pending_confirmation",
      email,
      status: error ? "failed" : report.sessionCreated ? "ok" : "pending",
      errorMessage: error?.message ?? null,
      metadata: report.diagnostics,
    });

    if (error || !report.providerHealthy) {
      setSignupState({ ok: false, message: report.message });
      setSignupPending(false);
      return;
    }

    if (report.sessionCreated) {
      window.location.assign("/onboarding");
      return;
    }

    setCooldown(60);
    setSignupState({ ok: true, message: report.message });
    setSignupPending(false);
  }

  async function handleResendVerification() {
    if (!lastEmail || cooldown > 0) return;

    const redirectTo = getSignupRedirectUrl(window.location.origin, "/onboarding");
    const supabase = createClient();
    setResendPending(true);

    console.info("[rook-auth:resend-verification] starting", {
      email: lastEmail,
      redirectTo,
      origin: window.location.origin,
    });

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: lastEmail,
      options: { emailRedirectTo: redirectTo },
    });

    console.info("[rook-auth:resend-verification] response", {
      email: lastEmail,
      redirectTarget: redirectTo,
      error: error ? { name: error.name, message: error.message, status: error.status } : null,
    });

    await logSignupDiagnosticAction({
      eventType: error ? "verification_resend_failure" : "verification_resend",
      email: lastEmail,
      status: error ? "failed" : "pending",
      errorMessage: error?.message ?? null,
      metadata: { redirectTo, origin: window.location.origin },
    });

    setSignupState({
      ok: !error,
      message: error ? error.message : "Verification email resent. Check inbox and spam before trying again.",
    });
    setCooldown(error ? 15 : 60);
    setResendPending(false);
  }

  return (
    <div className="surface-card relative w-full max-w-md overflow-hidden rounded-2xl p-5 sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(53,216,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(53,216,255,0.06)_1px,transparent_1px)] bg-[size:28px_28px] opacity-40" />
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-rook-cyan/10 blur-3xl" />
      <form action={mode === "login" ? action : undefined} onSubmit={handleSignupSubmit} className="relative">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="invite" value={invite} />
      <input type="hidden" name="source" value={invite ? "invite" : "direct"} />
      {mode === "signup" && clientRedirectTo && <input type="hidden" name="emailRedirectTo" value={clientRedirectTo} />}
      <div>
        <p className="inline-flex items-center gap-2 rounded-full border border-rook-cyan/25 bg-rook-cyan/10 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-rook-cyan">
          <ShieldCheck className="h-3.5 w-3.5" />
          {mode === "login" ? "Operator Access" : "Signal Intake"}
        </p>
        <h1 className="mt-3 text-3xl font-black text-white">
          {mode === "login" ? "Enter the live network" : "Create your operator identity"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-rook-muted">
          {mode === "login"
            ? "Continue into the Signal feed with Supabase-backed identity."
            : "Email confirmation activates an auto-generated operator profile, graph identity, starter reputation, and Pulse calibration."}
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {(["google", "github"] as const).map((provider) => (
          <button
            key={provider}
            formAction={oauthAction}
            formNoValidate
            name="provider"
            value={provider}
            className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] text-sm font-black text-white transition hover:border-rook-cyan/50 hover:bg-rook-cyan/10"
          >
            {provider === "github" ? <Github className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            {provider === "github" ? "GitHub" : "Google"}
          </button>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-rook-muted">
        <span className="h-px flex-1 bg-white/10" />
        <span>Email access</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-rook-muted">
            <Mail className="h-3.5 w-3.5" />
            Email
          </span>
          <input
            required
            type="email"
            name="email"
            className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 text-sm text-white outline-none transition focus:border-rook-blue"
            placeholder="you@company.com"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-rook-muted">
            Password
          </span>
          <input
            required
            type="password"
            name="password"
            minLength={6}
            className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 text-sm text-white outline-none transition focus:border-rook-blue"
            placeholder="Minimum 6 characters"
          />
        </label>
      </div>

      {visibleState.message && (
        <p
          className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
            visibleState.ok
              ? "border-rook-green/30 bg-rook-green/10 text-rook-green"
              : "border-red-400/30 bg-red-500/10 text-red-200"
          }`}
        >
          {visibleState.message}
        </p>
      )}

      {mode === "signup" && lastEmail && signupState.ok && (
        <button
          type="button"
          disabled={resendPending || cooldown > 0}
          onClick={handleResendVerification}
          className="focus-ring mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] px-4 text-sm font-black text-white transition hover:border-rook-cyan/40 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {resendPending ? "Resending..." : cooldown > 0 ? `Resend verification in ${cooldown}s` : "Resend verification email"}
        </button>
      )}

      {mode === "login" ? (
        <SubmitButton className="mt-6 w-full" pendingLabel="Logging in...">
          Log in
        </SubmitButton>
      ) : (
        <button
          type="submit"
          disabled={signupPending}
          className="focus-ring mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-white px-4 text-sm font-black text-rook-void transition hover:bg-rook-cyan disabled:cursor-not-allowed disabled:opacity-55"
        >
          {signupPending ? "Creating account..." : "Request operator activation"}
        </button>
      )}

      <p className="mt-5 text-center text-sm text-rook-muted">
        {mode === "login" ? "No account yet?" : "Already have access?"}{" "}
        <Link
          href={mode === "login" ? "/signup" : "/login"}
          className="font-bold text-rook-cyan transition hover:text-white"
        >
          {mode === "login" ? "Sign up" : "Log in"}
        </Link>
      </p>
      </form>
    </div>
  );
}
