import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { clsx } from "clsx";

type ButtonLinkProps = {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
};

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className,
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={clsx(
        "focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition duration-200",
        variant === "primary" &&
          "bg-white text-rook-void shadow-glow hover:bg-rook-cyan",
        variant === "secondary" &&
          "border border-white/10 bg-white/[0.06] text-white hover:border-rook-blue/50 hover:bg-white/[0.09]",
        variant === "ghost" && "text-rook-muted hover:text-white",
        className,
      )}
    >
      {children}
      {variant === "primary" && <ArrowRight className="h-4 w-4" />}
    </Link>
  );
}
