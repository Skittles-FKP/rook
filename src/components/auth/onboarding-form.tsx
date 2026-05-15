"use client";

import { useActionState } from "react";
import { BrainCircuit, Check, Compass, RadioTower, UsersRound } from "lucide-react";
import { onboardingAction, type ActionState } from "@/app/actions/auth";
import { SubmitButton } from "@/components/form/submit-button";
import type { Profile } from "@/lib/supabase/types";

const initialState: ActionState = { ok: false, message: "" };

const expertise = ["AI Markets", "Critical Infrastructure", "Policy", "Security", "Macro", "Product", "Research", "OSINT"];
const pulseTopics = ["Compute", "Energy", "Markets", "AI Safety", "Supply Chain", "Geopolitics"];
const aiInterests = ["Briefing", "Contradiction detection", "Narrative clustering", "Sentiment movement"];
const operatorTypes = ["Analyst", "Builder", "Researcher", "Investor", "Operator", "Policy Lead"];

export function OnboardingForm({ profile }: { profile: Profile | null }) {
  const [state, action] = useActionState(onboardingAction, initialState);

  return (
    <form action={action} className="surface-card w-full max-w-4xl rounded-2xl p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-rook-blue/15 text-rook-cyan">
          <Compass className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-rook-cyan">
            Operator Onboarding
          </p>
          <h1 className="mt-3 text-3xl font-black text-white">Calibrate your intelligence surface</h1>
          <p className="mt-3 text-sm leading-6 text-rook-muted">
            Rook uses these signals to recommend Flocks, seed your Pulse view, and frame future AI Briefs.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Username">
          <input
            required
            name="username"
            defaultValue={profile?.username ?? ""}
            minLength={3}
            maxLength={24}
            pattern="[a-zA-Z0-9_]+"
            className="h-12 w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 text-sm text-white outline-none focus:border-rook-blue"
          />
        </Field>
        <Field label="Display name">
          <input
            required
            name="displayName"
            defaultValue={profile?.display_name ?? ""}
            className="h-12 w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 text-sm text-white outline-none focus:border-rook-blue"
          />
        </Field>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <Field label="Operator type">
            <div className="grid grid-cols-2 gap-2">
              {operatorTypes.map((type) => (
                <Choice key={type} name="operatorType" value={type} single>
                  {type}
                </Choice>
              ))}
            </div>
          </Field>
          <Field label="Bio">
            <textarea
              name="bio"
              defaultValue={profile?.bio ?? ""}
              rows={4}
              className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.05] px-3 py-3 text-sm text-white outline-none focus:border-rook-blue"
              placeholder="What intelligence do you track?"
            />
          </Field>
          <Field label="Avatar URL">
            <input
              name="avatarUrl"
              defaultValue={profile?.avatar_url ?? ""}
              className="h-12 w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 text-sm text-white outline-none focus:border-rook-blue"
              placeholder="https://..."
            />
          </Field>
        </div>

        <div className="grid gap-4">
          <CalibrationPanel icon={RadioTower} title="Expertise domains">
            {expertise.map((item) => (
              <Choice key={item} name="expertise" value={item}>{item}</Choice>
            ))}
          </CalibrationPanel>
          <CalibrationPanel icon={UsersRound} title="Recommended Flock inputs">
            {pulseTopics.map((item) => (
              <Choice key={item} name="pulseTopics" value={item}>{item}</Choice>
            ))}
          </CalibrationPanel>
          <CalibrationPanel icon={BrainCircuit} title="AI interest calibration">
            {aiInterests.map((item) => (
              <Choice key={item} name="aiInterests" value={item}>{item}</Choice>
            ))}
          </CalibrationPanel>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.035] p-4">
        <p className="text-sm font-black text-white">First Signal guidance</p>
        <p className="mt-2 text-sm leading-6 text-rook-muted">
          Start with one observed change, the evidence behind it, and why other operators should monitor it. Rook will attach velocity and narrative context once it enters the network.
        </p>
      </div>

      {state.message && (
        <p className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {state.message}
        </p>
      )}

      <SubmitButton className="mt-6 w-full sm:w-auto" pendingLabel="Calibrating...">
        Enter Rook
      </SubmitButton>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-rook-muted">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function CalibrationPanel({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-rook-cyan" />
        <p className="text-xs font-black uppercase tracking-[0.18em] text-rook-muted">{title}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Choice({
  name,
  value,
  children,
  single = false,
}: {
  name: string;
  value: string;
  children: React.ReactNode;
  single?: boolean;
}) {
  return (
    <label className="group cursor-pointer">
      <input type={single ? "radio" : "checkbox"} name={name} value={value} className="peer sr-only" />
      <span className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-black text-rook-muted transition peer-checked:border-rook-cyan/50 peer-checked:bg-rook-cyan/10 peer-checked:text-rook-cyan">
        <Check className="hidden h-3.5 w-3.5 peer-checked:block" />
        {children}
      </span>
    </label>
  );
}
