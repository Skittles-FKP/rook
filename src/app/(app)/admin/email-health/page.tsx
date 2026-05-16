export const runtime = "edge";

import { Activity, AlertTriangle, CheckCircle2, Mail, Server, ShieldCheck } from "lucide-react";
import { getEmailInfrastructureStatus } from "@/lib/auth/email-config";
import { createClient } from "@/lib/supabase/server";

function HealthPill({ ready, label }: { ready: boolean; label: string }) {
  return (
    <div className="surface-card flex items-center justify-between rounded-xl p-4">
      <span className="text-sm font-bold text-rook-muted">{label}</span>
      <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${
        ready
          ? "border-rook-green/30 bg-rook-green/10 text-rook-green"
          : "border-red-400/30 bg-red-500/10 text-red-200"
      }`}>
        {ready ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
        {ready ? "Ready" : "Check"}
      </span>
    </div>
  );
}

export default async function EmailHealthPage() {
  const status = getEmailInfrastructureStatus();
  const supabase = await createClient();

  const [{ data: authEvents }, { data: waitlistEntries }] = await Promise.all([
    supabase
      .from("auth_events")
      .select("event_type,email,provider,status,error_message,created_at")
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("waitlist_entries")
      .select("email,status,invite_code,approved_at,created_at")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  return (
    <main className="space-y-6">
      <section className="surface-card overflow-hidden rounded-xl p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-rook-cyan">Auth Observability</p>
            <h1 className="mt-3 text-3xl font-black text-white">Email health console</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-rook-muted">
              Resend SMTP, Supabase Auth, confirmation state, invite queue, and recent operator access events.
            </p>
          </div>
          <div className="rounded-xl border border-rook-cyan/20 bg-rook-cyan/10 px-4 py-3 text-sm font-black text-rook-cyan">
            {status.smtp.host}:{status.smtp.port}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <HealthPill ready={status.configured} label="SMTP configured" />
        <HealthPill ready={status.resendKeyExists} label="Resend key exists" />
        <HealthPill ready={status.supabaseConfigured} label="Supabase auth status" />
        <HealthPill ready={status.missing.length === 0} label="Public env validation" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <div className="surface-card rounded-xl p-5">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-rook-cyan" />
            <h2 className="text-lg font-black text-white">Latest signup attempts</h2>
          </div>
          <div className="mt-5 space-y-3">
            {(authEvents ?? []).map((event) => (
              <div key={`${event.created_at}-${event.email}-${event.event_type}`} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-black text-white">{event.event_type}</span>
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-rook-muted">{event.status}</span>
                </div>
                <p className="mt-2 text-sm text-rook-muted">{event.email ?? event.provider ?? "system event"}</p>
                {event.error_message && <p className="mt-2 text-xs text-red-200">{event.error_message}</p>}
                <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-rook-muted">{new Date(event.created_at).toLocaleString()}</p>
              </div>
            ))}
            {(!authEvents || authEvents.length === 0) && (
              <p className="rounded-lg border border-white/10 bg-white/[0.035] p-4 text-sm text-rook-muted">No auth events recorded yet.</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="surface-card rounded-xl p-5">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-rook-cyan" />
              <h2 className="text-lg font-black text-white">Confirmation email state</h2>
            </div>
            <div className="mt-5 grid gap-3">
              <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm text-rook-muted">
                Supabase templates should point confirmation, recovery, and magic links to <span className="font-mono text-rook-cyan">{status.siteUrl ?? "NEXT_PUBLIC_SITE_URL"}/auth/callback</span>.
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm text-rook-muted">
                SMTP username <span className="font-mono text-white">{status.smtp.username}</span>, password from <span className="font-mono text-white">{status.smtp.passwordEnv}</span>.
              </div>
            </div>
          </div>

          <div className="surface-card rounded-xl p-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-rook-cyan" />
              <h2 className="text-lg font-black text-white">Invite queue</h2>
            </div>
            <div className="mt-5 space-y-3">
              {(waitlistEntries ?? []).map((entry) => (
                <div key={entry.email} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-white">{entry.email}</span>
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-rook-cyan">{entry.status}</span>
                  </div>
                  <p className="mt-2 text-xs text-rook-muted">{entry.invite_code ?? "Invite not issued"} · {entry.approved_at ? "approved" : "pending"}</p>
                </div>
              ))}
              {(!waitlistEntries || waitlistEntries.length === 0) && (
                <p className="rounded-lg border border-white/10 bg-white/[0.035] p-4 text-sm text-rook-muted">No waitlist entries recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="surface-card rounded-xl p-5">
        <div className="flex items-center gap-3">
          <Server className="h-5 w-5 text-rook-cyan" />
          <h2 className="text-lg font-black text-white">Auth provider health</h2>
        </div>
        <div className="mt-4 grid gap-3 text-sm text-rook-muted md:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">Email/password: Supabase Auth</div>
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">Google OAuth: Supabase provider</div>
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">GitHub OAuth: Supabase provider</div>
        </div>
      </section>
    </main>
  );
}
