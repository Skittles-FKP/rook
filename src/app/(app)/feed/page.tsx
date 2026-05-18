export const runtime = "edge";

import { PageHeader } from "@/components/shell/page-header";
import { SignalCard } from "@/components/signal-card";
import { SignalComposer } from "@/components/signals/signal-composer";
import { FeedRealtime } from "@/components/signals/feed-realtime";
import { MobileSignalFeed } from "@/components/signals/mobile-signal-feed";
import { EscalationBanner } from "@/components/narratives/escalation-banner";
import { getFeedSignals } from "@/lib/data/signals";
import { getFlocks } from "@/lib/data/flocks";
import { getNarrativeEscalationSnapshot } from "@/lib/narrative-escalation";
import { rankFeedSignals } from "@/lib/feed-ranking";
import { newsFeedAgent } from "@/lib/agents/news/newsFeedAgent";

export default async function FeedPage() {
  const [signalsResult, flocksResult, escalationResult] = await Promise.allSettled([
    getFeedSignals(),
    getFlocks(),
    getNarrativeEscalationSnapshot(3),
  ]);
  const signals = signalsResult.status === "fulfilled" ? signalsResult.value : [];
  const agentSignals = getSafeAgentSignals(signals);
  const rankedSignals = rankFeedSignals(agentSignals);
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
      <MobileSignalFeed signals={rankedSignals} flocks={flocks.map(({ id, name }) => ({ id, name }))} />
      <section className="mx-auto hidden w-full max-w-[920px] gap-4 px-3 py-4 sm:px-5 lg:grid lg:px-6">
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
        {rankedSignals.length === 0 && (
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
        {rankedSignals.length > 0 && (
          <div className="mx-auto grid w-full max-w-[860px] gap-5">
            {rankedSignals.map((item) => (
              <SignalCard
                key={item.signal.id}
                signal={item.signal}
                size={item.size === "XS" || item.size === "SM" ? "MD" : item.size}
                signalType={item.type}
                rhythm={item.rhythm}
                imageFirst={item.imageFirst}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function getSafeAgentSignals(signals: Awaited<ReturnType<typeof getFeedSignals>>) {
  try {
    return newsFeedAgent.generateInitialFeed(signals);
  } catch (error) {
    console.warn("[feed] NewsFeedAgent generation failed; rendering Supabase/demo fallback", {
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error,
      sourceCount: signals.length,
    });
    try {
      return [newsFeedAgent.nextMockSignal(0), newsFeedAgent.nextMockSignal(1), ...signals];
    } catch {
      return signals;
    }
  }
}
