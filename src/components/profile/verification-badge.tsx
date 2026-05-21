import { BadgeCheck, Bot, Crown, Landmark, ShieldCheck } from "lucide-react";
import { clsx } from "clsx";
import type { Profile } from "@/lib/supabase/types";

type VerificationSubject = Pick<
  Profile,
  "verified_operator" | "is_verified" | "is_premium" | "verification_type" | "membership_tier"
> | null | undefined;

type BadgeTone = "verified" | "ai" | "analyst" | "institution" | "premium";

type BadgeConfig = {
  label: string;
  tone: BadgeTone;
  icon: typeof BadgeCheck;
};

export function hasVerificationBadge(subject: VerificationSubject) {
  return Boolean(resolveVerificationBadge(subject));
}

export function getVerificationBadgeLabel(subject: VerificationSubject) {
  return resolveVerificationBadge(subject)?.label ?? null;
}

export function VerificationBadge({
  subject,
  showLabel = false,
  className,
}: {
  subject: VerificationSubject;
  showLabel?: boolean;
  className?: string;
}) {
  const badge = resolveVerificationBadge(subject);
  if (!badge) return null;

  const Icon = badge.icon;

  return (
    <span
      aria-label={badge.label}
      title={badge.label}
      className={clsx(
        "inline-flex max-w-full shrink-0 items-center gap-1 overflow-hidden rounded-full border align-middle font-black uppercase tracking-[0.08em]",
        showLabel ? "px-2 py-0.5 text-[10px]" : "h-4 w-4 justify-center p-0 text-[0px]",
        getToneClassName(badge.tone),
        className,
      )}
    >
      <Icon className={clsx("shrink-0", showLabel ? "h-3.5 w-3.5" : "h-3 w-3")} />
      {showLabel && <span className="min-w-0 truncate">{badge.label}</span>}
    </span>
  );
}

function resolveVerificationBadge(subject: VerificationSubject): BadgeConfig | null {
  if (!subject) return null;

  const type = subject.verification_type;
  const tier = subject.membership_tier;
  const verified = Boolean(subject.is_verified || subject.verified_operator);
  const premium = Boolean(subject.is_premium || tier === "premium" || type === "premium");

  if (type === "institution" || tier === "institution") {
    return { label: "Institution verified", tone: "institution", icon: Landmark };
  }

  if (type === "analyst" || tier === "analyst") {
    return { label: "Analyst verified", tone: "analyst", icon: ShieldCheck };
  }

  if (type === "ai_operator" || tier === "ai_operator") {
    return { label: premium ? "Premium AI operator" : "AI operator verified", tone: "ai", icon: Bot };
  }

  if (premium) {
    return { label: "Premium member", tone: "premium", icon: Crown };
  }

  if (verified || type === "human") {
    return { label: "Verified operator", tone: "verified", icon: BadgeCheck };
  }

  return null;
}

function getToneClassName(tone: BadgeTone) {
  switch (tone) {
    case "ai":
      return "border-rook-cyan/25 bg-rook-cyan/10 text-rook-cyan";
    case "analyst":
      return "border-rook-green/25 bg-rook-green/10 text-rook-green";
    case "institution":
      return "border-rook-violet/25 bg-rook-violet/10 text-rook-violet";
    case "premium":
      return "border-rook-amber/25 bg-rook-amber/10 text-rook-amber";
    case "verified":
    default:
      return "border-rook-cyan/25 bg-rook-cyan/10 text-rook-cyan";
  }
}
