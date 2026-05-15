"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, signUpAction, type ActionState } from "@/app/actions/auth";
import { SubmitButton } from "@/components/form/submit-button";

const initialState: ActionState = { ok: false, message: "" };

export function AuthForm({
  mode,
  next = "/feed",
}: {
  mode: "login" | "signup";
  next?: string;
}) {
  const [state, action] = useActionState(mode === "login" ? loginAction : signUpAction, initialState);

  return (
    <form action={action} className="surface-card w-full max-w-md rounded-2xl p-5 sm:p-6">
      <input type="hidden" name="next" value={next} />
      <div>
        <p className="text-xs font-black uppercase tracking-[0.28em] text-rook-cyan">
          {mode === "login" ? "Access" : "Join Rook"}
        </p>
        <h1 className="mt-3 text-3xl font-black text-white">
          {mode === "login" ? "Log in to command feed" : "Create your operator identity"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-rook-muted">
          {mode === "login"
            ? "Continue into your Signal network."
            : "Email/password auth is backed by Supabase. Your profile is created on signup."}
        </p>
      </div>

      <div className="mt-6 space-y-4">
        {mode === "signup" && (
          <>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-rook-muted">
                Username
              </span>
              <input
                required
                name="username"
                minLength={3}
                maxLength={24}
                pattern="[a-zA-Z0-9_]+"
                className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 text-sm text-white outline-none transition focus:border-rook-blue"
                placeholder="mara_research"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-rook-muted">
                Display name
              </span>
              <input
                required
                name="displayName"
                className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 text-sm text-white outline-none transition focus:border-rook-blue"
                placeholder="Mara Vale"
              />
            </label>
          </>
        )}
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-rook-muted">
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
        {mode === "login" ? "Log in" : "Sign up"}
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
  );
}
