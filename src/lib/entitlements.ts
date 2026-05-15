export type SubscriptionTier = "free" | "operator" | "pro" | "enterprise";

export type EntitlementKey =
  | "signals.publish"
  | "briefs.generate"
  | "pulse.advanced"
  | "graph.advanced"
  | "search.semantic"
  | "ingest.external"
  | "workspaces.private"
  | "exports.executive";

export type Entitlement = {
  key: EntitlementKey;
  minimumTier: SubscriptionTier;
  label: string;
};

const tierRank: Record<SubscriptionTier, number> = {
  free: 0,
  operator: 1,
  pro: 2,
  enterprise: 3,
};

export const entitlements: Entitlement[] = [
  { key: "signals.publish", minimumTier: "free", label: "Publish Signals" },
  { key: "briefs.generate", minimumTier: "operator", label: "Generate AI Briefs" },
  { key: "pulse.advanced", minimumTier: "pro", label: "Advanced Pulse analytics" },
  { key: "graph.advanced", minimumTier: "pro", label: "Advanced graph intelligence" },
  { key: "search.semantic", minimumTier: "operator", label: "Semantic intelligence search" },
  { key: "ingest.external", minimumTier: "pro", label: "External signal ingestion" },
  { key: "workspaces.private", minimumTier: "enterprise", label: "Private intelligence workspaces" },
  { key: "exports.executive", minimumTier: "enterprise", label: "Executive intelligence exports" },
];

export function getDefaultTier(): SubscriptionTier {
  const configured = process.env.ROOK_DEFAULT_TIER;
  if (configured === "operator" || configured === "pro" || configured === "enterprise") {
    return configured;
  }

  return "free";
}

export function canUseEntitlement(tier: SubscriptionTier, key: EntitlementKey) {
  const entitlement = entitlements.find((item) => item.key === key);
  if (!entitlement) return false;
  return tierRank[tier] >= tierRank[entitlement.minimumTier];
}

export function getTierMatrix(tier: SubscriptionTier = getDefaultTier()) {
  return entitlements.map((item) => ({
    ...item,
    enabled: canUseEntitlement(tier, item.key),
  }));
}
