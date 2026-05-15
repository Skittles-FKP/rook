import { getFlocks } from "@/lib/data/flocks";
import { getPulseSnapshot } from "@/lib/data/pulse";

export type WorkspaceRole = "owner" | "admin" | "analyst" | "operator" | "viewer";

export type WorkspaceCapability =
  | "private_signals"
  | "internal_pulse"
  | "private_graph"
  | "scheduled_briefs"
  | "executive_exports"
  | "workspace_admin";

export type WorkspaceSummary = {
  id: string;
  name: string;
  classification: "internal" | "restricted" | "confidential";
  operators: number;
  private_rooms: number;
  pulse_score: number;
  capabilities: WorkspaceCapability[];
};

export async function getEnterpriseWorkspaces(): Promise<WorkspaceSummary[]> {
  const [flocks, pulse] = await Promise.all([getFlocks(), getPulseSnapshot(72)]);

  return [
    {
      id: "ai-infra-command",
      name: "AI Infrastructure Command",
      classification: "restricted",
      operators: Math.max(4, flocks[0]?.members_count ?? 4),
      private_rooms: 3,
      pulse_score: pulse.clusters[0]?.pulse_score ?? 72,
      capabilities: ["private_signals", "internal_pulse", "private_graph", "scheduled_briefs"],
    },
    {
      id: "market-intel-desk",
      name: "Market Intelligence Desk",
      classification: "confidential",
      operators: Math.max(3, flocks[1]?.members_count ?? 3),
      private_rooms: 2,
      pulse_score: pulse.clusters[1]?.pulse_score ?? 61,
      capabilities: ["private_signals", "internal_pulse", "executive_exports", "workspace_admin"],
    },
    {
      id: "policy-watch",
      name: "Policy Watch Cell",
      classification: "internal",
      operators: Math.max(2, flocks[2]?.members_count ?? 2),
      private_rooms: 2,
      pulse_score: pulse.clusters[2]?.pulse_score ?? 54,
      capabilities: ["private_signals", "scheduled_briefs", "workspace_admin"],
    },
  ];
}

export function getAccessMatrix() {
  const roles: WorkspaceRole[] = ["owner", "admin", "analyst", "operator", "viewer"];
  const capabilities: WorkspaceCapability[] = [
    "private_signals",
    "internal_pulse",
    "private_graph",
    "scheduled_briefs",
    "executive_exports",
    "workspace_admin",
  ];

  return roles.map((role, index) => ({
    role,
    capabilities: capabilities.map((capability, capabilityIndex) => ({
      capability,
      enabled: capabilityIndex <= capabilities.length - index - 1,
    })),
  }));
}
