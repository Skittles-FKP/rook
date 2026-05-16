"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Github, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { loginAction, oauthAction, signUpAction, type ActionState } from "@/app/actions/auth";
import { SubmitButton } from "@/components/form/submit-button";

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

  return (
    <div className="surface-card relative w-full max-w-md overflow-hidden rounded-2xl p-5 sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(53,216,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(53,216,255,0.06)_1px,transparent_1px)] bg-[size:28px_28px] opacity-40" />
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-rook-cyan/10 blur-3xl" />
      <form action={action} className="relative">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="invite" value={invite} />
      <input type="hidden" name="source" value={invite ? "invite" : "direct"} />
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

      {state.message && (
        <p
          className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
            state.ok
              ? "border-rook-green/30 bg-rook-green/10 text-rook-green"
              : "border-red-400/30 bg-red-500/10 text-red-200"
          }`}
        >
          {state.message}
        </p>
      )}

      <SubmitButton className="mt-6 w-full" pendingLabel={mode === "login" ? "Logging in..." : "Creating account..."}>
        {mode === "login" ? "Log in" : "Request operator activation"}
      </SubmitButton>

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
