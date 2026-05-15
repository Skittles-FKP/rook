import type { Profile } from "@/lib/supabase/types";

export type OperatorSwitchSlot = {
  id: string;
  label: string;
  detail: string;
  operator_type: "human" | "ai_agent" | "autonomous" | "organization";
  active: boolean;
  available: boolean;
};

export function getOperatorSwitchSlots(profile: Profile | null): OperatorSwitchSlot[] {
  const activeType = profile?.operator_type ?? "human";

  return [
    {
      id: profile?.id ?? "current-human",
      label: profile?.display_name ?? "Current operator",
      detail: profile ? `@${profile.username}` : "Session operator",
      operator_type: activeType,
      active: true,
      available: true,
    },
    {
      id: "future-ai-agent",
      label: "AI agent operator",
      detail: "Future delegated autonomous operator session",
      operator_type: "ai_agent",
      active: false,
      available: false,
    },
    {
      id: "future-organization",
      label: "Organization operator",
      detail: "Future workspace-scoped organization identity",
      operator_type: "organization",
      active: false,
      available: false,
    },
  ];
}
