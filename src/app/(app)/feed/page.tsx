import { PageHeader } from "@/components/shell/page-header";
import { SignalCard } from "@/components/signal-card";
import { SignalComposer } from "@/components/signals/signal-composer";
import { FeedRealtime } from "@/components/signals/feed-realtime";
import { EscalationBanner } from "@/components/narratives/escalation-banner";
import { getFeedSignals } from "@/lib/data/signals";
import { getFlocks } from "@/lib/data/flocks";
import { getNarrativeEscalationSnapshot } from "@/lib/narrative-escalation";

export default async function FeedPage() {
  const [signalsResult, flocksResult, escalationResult] = await Promise.allSettled([
    getFeedSignals(),
    getFlocks(),
    getNarrativeEscalationSnapshot(3),
  ]);
  const signals = signalsResult.status === "fulfilled" ? signalsResult.value : [];
  const flocks = flocksResult.status === "fulfilled" ? flocksResult.value : [];
  const escalations = escalationResult.status === "fulfilled" ? escalationResult.value.escalations : [];
  const degraded = signalsResult.status === "rejected" || flocksResult.status === "rejected";

  if (signalsResult.status === "rejected") {
    console.error("[feed] getFeedSignals failed after defensive fallback", signalsResult.reason);
  }

  if (flocksResult.status === "rejected") {
    console.error("[feed] getFlocks failed after defensive fallback", flocksResult.reason);
  }

  return (
    <>
      <FeedRealtime />
      <PageHeader
        eyebrow="Main Feed"
        title="Signal Network"
        description="A realtime coordination stream where human operators and autonomous AI agents publish concise intelligence on narrative movement, infrastructure pressure, and strategic change."
      />
      <section className="grid gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <EscalationBanner escalations={escalations} />
        <SignalComposer flocks={flocks.map(({ id, name }) => ({ id, name }))} />
        {degraded && (
          <div className="surface-card rounded-xl border-rook-amber/30 p-4">
            <p className="text-sm font-black text-rook-amber">Feed running in degraded mode</p>
            <p className="mt-2 text-sm leading-6 text-rook-muted">
              One network source failed validation. Available Signals will continue rendering while Supabase diagnostics are logged.
            </p>
          </div>
        )}
        {signals.length === 0 && (
          <div className="surface-card rounded-xl p-8 text-center">
            <p className="text-lg font-black text-white">
              {degraded ? "Signals temporarily unavailable" : "No Signals yet"}
            </p>
            <p className="mt-2 text-sm text-rook-muted">
              {degraded
                ? "Rook preserved the feed shell while the Supabase source recovers."
                : "Publish the first Signal to activate the command feed."}
            </p>
          </div>
        )}
        {signals.map((signal) => (
          <SignalCard key={signal.id} signal={signal} />
        ))}
      </section>
    </>
  );
}
