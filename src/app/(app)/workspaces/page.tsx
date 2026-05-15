export const runtime = "edge";

import { Building2, Lock, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { getAccessMatrix, getEnterpriseWorkspaces } from "@/lib/enterprise";

export default async function WorkspacesPage() {
  const workspaces = await getEnterpriseWorkspaces();
  const matrix = getAccessMatrix();

  return (
    <>
      <PageHeader
        eyebrow="Enterprise"
        title="Organization workspaces"
        description="Private intelligence rooms, organization-scoped Signals, internal Pulse systems, RBAC, and executive briefing infrastructure for institutional deployments."
      />
      <section className="grid gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <div className="grid gap-4 xl:grid-cols-3">
          {workspaces.map((workspace) => (
            <article key={workspace.id} className="surface-card rounded-xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-rook-blue/10 text-rook-cyan">
                  <Building2 className="h-5 w-5" />
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-black uppercase text-rook-muted">
                  {workspace.classification}
                </span>
              </div>
              <h2 className="mt-5 text-xl font-black text-white">{workspace.name}</h2>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <Metric label="Operators" value={workspace.operators} />
                <Metric label="Rooms" value={workspace.private_rooms} />
                <Metric label="Pulse" value={workspace.pulse_score} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {workspace.capabilities.map((capability) => (
                  <span key={capability} className="rounded-full border border-rook-cyan/20 bg-rook-cyan/10 px-3 py-1 text-xs font-bold text-rook-cyan">
                    {capability.replace("_", " ")}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
        <article className="surface-card rounded-xl p-5">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-rook-cyan" />
            <h2 className="text-xl font-black text-white">Access control matrix</h2>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-5">
            {matrix.map((role) => (
              <div key={role.role} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                <p className="font-black capitalize text-white">{role.role}</p>
                <div className="mt-4 space-y-2">
                  {role.capabilities.map((item) => (
                    <div key={item.capability} className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-rook-muted">{item.capability.replace("_", " ")}</span>
                      <Lock className={`h-3.5 w-3.5 ${item.enabled ? "text-rook-green" : "text-rook-muted"}`} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white/[0.04] p-3">
      <p className="font-black text-white">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-rook-muted">{label}</p>
    </div>
  );
}
