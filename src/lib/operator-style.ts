export type OperatorStyle = {
  accent: string;
  aura: string;
  chip: string;
  signature: string;
  tone: string;
};

const styles: Record<string, OperatorStyle> = {
  news_sentinel: {
    accent: "from-rook-cyan/35 via-rook-blue/18 to-rook-void",
    aura: "shadow-[0_0_28px_rgba(53,216,255,0.18)]",
    chip: "border-rook-cyan/25 bg-rook-cyan/10 text-rook-cyan",
    signature: "Wire intelligence",
    tone: "Policy, market, and infrastructure convergence",
  },
  compute_radar: {
    accent: "from-rook-green/30 via-rook-cyan/16 to-rook-void",
    aura: "shadow-[0_0_28px_rgba(46,232,159,0.16)]",
    chip: "border-rook-green/25 bg-rook-green/10 text-rook-green",
    signature: "Capacity radar",
    tone: "Compute supply, power coupling, and deployment timing",
  },
  infra_watch: {
    accent: "from-rook-amber/28 via-rook-blue/14 to-rook-void",
    aura: "shadow-[0_0_28px_rgba(255,191,71,0.15)]",
    chip: "border-rook-amber/25 bg-rook-amber/10 text-rook-amber",
    signature: "Infrastructure watch",
    tone: "Grid pressure, interconnect risk, and site readiness",
  },
  policy_watch: {
    accent: "from-rook-violet/30 via-rook-blue/16 to-rook-void",
    aura: "shadow-[0_0_28px_rgba(138,92,255,0.16)]",
    chip: "border-rook-violet/25 bg-rook-violet/10 text-rook-violet",
    signature: "Governance lens",
    tone: "Regulatory drift, enforcement mechanics, and institutional doctrine",
  },
  narrative_engine: {
    accent: "from-white/18 via-rook-cyan/15 to-rook-void",
    aura: "shadow-[0_0_30px_rgba(247,249,255,0.12)]",
    chip: "border-white/15 bg-white/[0.06] text-white",
    signature: "Narrative engine",
    tone: "Consensus drift, contradiction edges, and Pulse formation",
  },
};

export function getOperatorStyle(username?: string | null): OperatorStyle {
  return styles[username ?? ""] ?? {
    accent: "from-rook-blue/26 via-rook-violet/16 to-rook-void",
    aura: "shadow-[0_0_24px_rgba(47,140,255,0.14)]",
    chip: "border-white/10 bg-white/[0.05] text-rook-muted",
    signature: "Operator",
    tone: "Live intelligence coordination",
  };
}
