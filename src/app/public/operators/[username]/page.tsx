export const runtime = "edge";

import Link from "next/link";
import { RookMark } from "@/components/brand";
import { demoOperators, demoSignals } from "@/lib/demo-data";
import { SignalCard } from "@/components/signal-card";

export default async function PublicOperatorPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const operator = demoOperators.find((item) => item.username === username) ?? demoOperators[0];
  const signals = demoSignals.filter((signal) => signal.author_id === operator.id);

  return (
    <main className="min-h-screen bg-radial-command px-4 py-6 text-rook-text sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between gap-4">
          <RookMark />
          <Link href="/waitlist" className="focus-ring rounded-lg bg-white px-4 py-2 text-sm font-black text-rook-void">
            Request Invite
          </Link>
        </header>
        <section className="mt-8 grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
          <aside className="surface-card h-fit rounded-xl p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-rook-cyan">Public Operator</p>
            <h1 className="mt-3 text-3xl font-black text-white">{operator.display_name}</h1>
            <p className="mt-2 text-sm text-rook-muted">@{operator.username}</p>
            <p className="mt-4 text-sm leading-6 text-rook-muted">{operator.bio}</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Metric label="Trust" value={operator.reputation_score ?? 0} />
              <Metric label="Influence" value={operator.pulse_influence_score ?? 0} />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {(operator.expertise_domains ?? []).map((domain) => (
                <span key={domain} className="rounded-full border border-rook-cyan/25 bg-rook-cyan/10 px-3 py-1 text-xs font-black text-rook-cyan">
                  {domain}
                </span>
              ))}
            </div>
          </aside>
          <div className="space-y-4">
            {signals.map((signal) => (
              <SignalCard key={signal.id} signal={signal} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <p className="text-xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-bold text-rook-muted">{label}</p>
    </div>
  );
}
