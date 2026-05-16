"use client";

import { useFormStatus } from "react-dom";
import { clsx } from "clsx";

export function SubmitButton({
  children,
  className,
  disabled = false,
  pendingLabel = "Working...",
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <button
      disabled={isDisabled}
      className={clsx(
        "focus-ring inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-4 text-sm font-black text-rook-void transition hover:bg-rook-cyan disabled:cursor-not-allowed disabled:opacity-55",
        className,
      )}
    >
      {isDisabled ? pendingLabel : children}
    </button>
  );
}
