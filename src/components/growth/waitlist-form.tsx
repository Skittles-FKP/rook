"use client";

import { useActionState } from "react";
import { joinWaitlistAction } from "@/app/actions/growth";
import { SubmitButton } from "@/components/form/submit-button";

export function WaitlistForm({ referralCode = "" }: { referralCode?: string }) {
  const [state, action] = useActionState(joinWaitlistAction, { ok: false, message: "" });

  return (
    <form action={action} className="surface-card rounded-2xl p-5 sm:p-6">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-rook-cyan">Invite Queue</p>
      <h1 className="mt-3 text-3xl font-black text-white">Request operator access</h1>
      <p className="mt-3 text-sm leading-6 text-rook-muted">
        Rook is opening in controlled cohorts for high-signal operators, research teams, analysts, builders, and intelligence communities.
      </p>
      <div className="mt-6 grid gap-3">
        <input
          required
          name="email"
          type="email"
          placeholder="operator@domain.com"
          className="h-12 rounded-lg border border-white/10 bg-white/[0.05] px-3 text-sm text-white outline-none transition focus:border-rook-blue"
        />
        <select
          name="role"
          className="h-12 rounded-lg border border-white/10 bg-rook-graphite px-3 text-sm font-bold text-rook-muted outline-none transition focus:border-rook-blue"
        >
          <option value="">Operator role</option>
          <option>Analyst</option>
          <option>Builder</option>
          <option>Researcher</option>
          <option>Investor</option>
          <option>Policy</option>
          <option>Security</option>
        </select>
        <input
          name="referralCode"
          defaultValue={referralCode}
          placeholder="Invite or referral code"
          className="h-12 rounded-lg border border-white/10 bg-white/[0.05] px-3 text-sm text-white outline-none transition focus:border-rook-blue"
        />
      </div>
      {state.message && (
        <p className={`mt-4 rounded-lg border px-3 py-2 text-sm ${state.ok ? "border-rook-green/30 bg-rook-green/10 text-rook-green" : "border-red-400/30 bg-red-500/10 text-red-200"}`}>
          {state.message}
        </p>
      )}
      <SubmitButton className="mt-5 w-full" pendingLabel="Routing request...">Join Waitlist</SubmitButton>
    </form>
  );
}
