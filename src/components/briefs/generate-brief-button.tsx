"use client";

import { useActionState } from "react";
import { RefreshCw } from "lucide-react";
import { generateBriefAction } from "@/app/actions/briefs";
import { SubmitButton } from "@/components/form/submit-button";

export function GenerateBriefButton({
  clusterKey,
  label = "Generate Brief",
}: {
  clusterKey: string;
  label?: string;
}) {
  const [state, formAction] = useActionState(generateBriefAction, {
    ok: false,
    message: "",
  });

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="clusterKey" value={clusterKey} />
      <SubmitButton className="min-h-10 rounded-lg bg-white px-4 text-sm font-black text-rook-void transition hover:bg-rook-cyan">
        <RefreshCw className="h-4 w-4" />
        {label}
      </SubmitButton>
      {state.message && (
        <p className={`text-xs font-semibold ${state.ok ? "text-rook-green" : "text-rook-amber"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
