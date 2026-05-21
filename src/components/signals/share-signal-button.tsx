"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { clsx } from "clsx";

export function ShareSignalButton({
  signalId,
  title,
  compact = false,
  className,
}: {
  signalId: string;
  title?: string | null;
  compact?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function shareSignal() {
    const url = buildSignalUrl(signalId);
    const browserNavigator = typeof window !== "undefined" ? window.navigator : null;
    try {
      if (browserNavigator && typeof browserNavigator.share === "function") {
        await browserNavigator.share({
          title: title ? `${title} | Rook Signal` : "Rook Signal",
          text: title ?? "View this Signal on Rook.",
          url,
        });
        return;
      }

      if (browserNavigator?.clipboard) {
        await browserNavigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }
    } catch (error) {
      if (browserNavigator?.clipboard) {
        await browserNavigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      } else {
        console.warn("[signals:share] share unavailable", error);
      }
    }
  }

  const Icon = copied ? Check : Share2;

  return (
    <button
      type="button"
      onClick={shareSignal}
      aria-label={copied ? "Signal link copied" : "Share Signal"}
      className={clsx(
        "focus-ring transition active:scale-95",
        compact
          ? "grid min-h-9 place-items-center rounded-full bg-white/[0.035] hover:bg-white/[0.06] hover:text-white"
          : "inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3 text-xs font-black text-rook-muted hover:text-white",
        copied && "text-rook-green",
        className,
      )}
    >
      <Icon className={clsx(compact ? "h-3.5 w-3.5" : "h-4 w-4", copied ? "text-rook-green" : "text-rook-cyan")} />
      {!compact && (copied ? "Copied" : "Share")}
    </button>
  );
}

function buildSignalUrl(signalId: string) {
  const path = `/signals/${encodeURIComponent(signalId)}`;
  if (typeof window === "undefined") return path;
  return new URL(path, window.location.origin).toString();
}
