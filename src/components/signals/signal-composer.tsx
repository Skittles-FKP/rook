"use client";

import { useActionState } from "react";
import { BarChart3, ImageIcon, Link2, Radio } from "lucide-react";
import { createSignalAction } from "@/app/actions/signals";
import { SubmitButton } from "@/components/form/submit-button";
import type { ActionState } from "@/app/actions/auth";
import type { Flock } from "@/lib/supabase/types";

const initialState: ActionState = { ok: false, message: "" };

export function SignalComposer({ flocks }: { flocks: Pick<Flock, "id" | "name">[] }) {
  const [state, action] = useActionState(createSignalAction, initialState);

  return (
    <form action={action} className="surface-card rounded-xl p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-rook-blue/15 text-rook-cyan">
          <Radio className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-black text-white">Publish a Signal</h2>
          <p className="text-sm text-rook-muted">Share high-context intelligence with the network.</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3">
        <input
          required
          name="title"
          minLength={4}
          maxLength={180}
          placeholder="Signal title"
          className="h-12 rounded-lg border border-white/10 bg-white/[0.05] px-3 text-sm font-bold text-white outline-none transition focus:border-rook-blue"
        />
        <textarea
          required
          name="body"
          rows={4}
          maxLength={2000}
          placeholder="What changed, why it matters, and what evidence supports it?"
          className="resize-none rounded-lg border border-white/10 bg-white/[0.05] px-3 py-3 text-sm leading-6 text-white outline-none transition focus:border-rook-blue"
        />
        <div className="grid gap-3 md:grid-cols-2">
          <LabelledInput icon={ImageIcon} name="imageUrl" placeholder="Image URL" />
          <LabelledInput icon={BarChart3} name="chartUrl" placeholder="Chart URL" />
          <LabelledInput icon={Link2} name="referenceUrl" placeholder="Reference URL" />
          <LabelledInput icon={Link2} name="embedUrl" placeholder="Tactical embed URL" />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <select
            name="flockId"
            className="h-11 rounded-lg border border-white/10 bg-rook-graphite px-3 text-sm font-bold text-rook-muted outline-none transition focus:border-rook-blue"
          >
            <option value="">No Flock</option>
            {flocks.map((flock) => (
              <option key={flock.id} value={flock.id}>
                {flock.name}
              </option>
            ))}
          </select>
          <SubmitButton pendingLabel="Publishing...">Publish Signal</SubmitButton>
        </div>
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
    </form>
  );
}

function LabelledInput({
  icon: Icon,
  name,
  placeholder,
}: {
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  placeholder: string;
}) {
  return (
    <label className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rook-muted" />
      <input
        name={name}
        type="url"
        placeholder={placeholder}
        className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.05] pl-10 pr-3 text-sm text-white outline-none transition focus:border-rook-blue"
      />
    </label>
  );
}
