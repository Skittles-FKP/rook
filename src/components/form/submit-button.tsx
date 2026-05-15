"use client";

import { useFormStatus } from "react-dom";
import { clsx } from "clsx";

export function SubmitButton({
  children,
  className,
  pendingLabel = "Working...",
}: {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      disabled={pending}
      className={clsx(
        "focus-ring inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-4 text-sm font-black text-rook-void transition hover:bg-rook-cyan disabled:cursor-not-allowed disabled:opacity-55",
        className,
      )}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
