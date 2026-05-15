"use client";

import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";

export function SignOutButton({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <form action={logoutAction}>
      <button
        aria-label="Sign out"
        title="Sign out"
        className={`focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-3 text-sm font-bold text-rook-muted transition hover:border-red-300/40 hover:text-white ${className}`}
      >
        <LogOut className="h-4 w-4" />
        {compact ? <span className="sr-only">Sign out</span> : "Sign out"}
      </button>
    </form>
  );
}
