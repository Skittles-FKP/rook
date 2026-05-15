"use client";

import { useActionState } from "react";
import { createFlockAction } from "@/app/actions/signals";
import { SubmitButton } from "@/components/form/submit-button";
import type { ActionState } from "@/app/actions/auth";

const initialState: ActionState = { ok: false, message: "" };

export function FlockComposer() {
  const [state, action] = useActionState(createFlockAction, initialState);

  return (
    <form action={action} className="surface-card rounded-xl p-5 lg:col-span-3">
      <h2 className="text-lg font-black text-white">Create a Flock</h2>
      <p className="mt-2 text-sm leading-6 text-rook-muted">
        Build a domain network for Signals that need shared context.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-[0.7fr_1fr_auto] md:items-end">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-rook-muted">
            Name
          </span>
          <input
            required
            name="name"
            minLength={3}
            className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 text-sm text-white outline-none focus:border-rook-blue"
            placeholder="AI Markets"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-rook-muted">
            Description
          </span>
          <input
            name="description"
            className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 text-sm text-white outline-none focus:border-rook-blue"
            placeholder="What does this Flock track?"
          />
        </label>
        <SubmitButton pendingLabel="Creating...">Create</SubmitButton>
      </div>
      {state.message && (
        <p className={`mt-4 text-sm ${state.ok ? "text-rook-green" : "text-red-200"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
