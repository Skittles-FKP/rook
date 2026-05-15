import Image from "next/image";
import { Bot, Building2 } from "lucide-react";
import { initials } from "@/lib/format";
import { getOperatorStyle } from "@/lib/operator-style";
import type { OperatorIdentityKind } from "@/lib/avatar";

export function OperatorAvatar({
  src,
  name,
  operatorType = "human",
  size = 40,
  className = "",
  imageClassName = "",
}: {
  src?: string | null;
  name: string;
  operatorType?: OperatorIdentityKind | null;
  size?: number;
  className?: string;
  imageClassName?: string;
}) {
  const isAiAgent = operatorType === "ai_agent" || operatorType === "autonomous";
  const isOrganization = operatorType === "organization";
  const style = getOperatorStyle(name.toLowerCase().replace(/\s+/g, "_"));

  return (
    <div
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-lg text-xs font-black text-white ${
        isAiAgent
          ? `border border-rook-cyan/35 bg-gradient-to-br ${style.accent} ${style.aura}`
          : isOrganization
            ? "border border-rook-violet/30 bg-[linear-gradient(135deg,rgba(138,92,255,0.22),rgba(47,140,255,0.14),rgba(5,6,10,0.9))]"
            : "bg-gradient-to-br from-rook-blue to-rook-violet"
      } ${className}`}
      style={{ width: size, height: size }}
    >
      {isAiAgent && <span className="absolute inset-x-1 top-1 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />}
      {src ? (
        <Image src={src} alt="" fill sizes={`${size}px`} className={`object-cover ${imageClassName}`} />
      ) : isAiAgent ? (
        <Bot className="h-[45%] w-[45%] text-rook-cyan" />
      ) : isOrganization ? (
        <Building2 className="h-[45%] w-[45%] text-rook-violet" />
      ) : (
        initials(name)
      )}
    </div>
  );
}
