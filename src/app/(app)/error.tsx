"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(JSON.stringify({
      level: "error",
      event: "app.error_boundary",
      message: error.message,
      digest: error.digest ?? null,
      created_at: new Date().toISOString(),
    }));
  }, [error]);

  return (
    <section className="grid min-h-[70vh] place-items-center px-4 py-10">
      <div className="surface-card max-w-xl rounded-xl p-6 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-rook-amber/10 text-rook-amber">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-rook-cyan">
          Operational Fault
        </p>
        <h1 className="mt-2 text-2xl font-black text-white">Rook isolated a runtime error</h1>
        <p className="mt-3 text-sm leading-6 text-rook-muted">
          The shell remains active. Retry the surface or inspect production logs if the fault repeats.
        </p>
        <button
          type="button"
          onClick={reset}
          className="focus-ring mx-auto mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-white px-4 text-sm font-black text-rook-void transition hover:bg-rook-cyan"
        >
          <RotateCcw className="h-4 w-4" />
          Retry Surface
        </button>
      </div>
    </section>
  );
}
