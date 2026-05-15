"use client";

import { useActionState } from "react";
import { RadioTower } from "lucide-react";
import { runAutonomousBriefSweepAction } from "@/app/actions/agents";
import { SubmitButton } from "@/components/form/submit-button";

export function AutonomousBriefSweepButton() {
  const [state, formAction] = useActionState(runAutonomousBriefSweepAction, {
    ok: false,
    message: "",
  });

  return (
    <form action={formAction} className="space-y-2">
      <SubmitButton
        className="min-h-10 rounded-lg bg-white px-4 text-sm font-black text-rook-void transition hover:bg-rook-cyan"
        pendingLabel="Running sweep..."
      >
        <RadioTower className="h-4 w-4" />
        Run Autonomous Sweep
      </SubmitButton>
      {state.message && (
        <p className={`max-w-md text-xs font-semibold ${state.ok ? "text-rook-green" : "text-rook-amber"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
