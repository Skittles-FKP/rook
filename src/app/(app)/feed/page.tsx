export const runtime = "edge";

import { Activity, RadioTower, TrendingUp, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { SignalCard } from "@/components/signal-card";
import { SignalComposer } from "@/components/signals/signal-composer";
import { FeedRealtime } from "@/components/signals/feed-realtime";
import { MobileSignalFeed } from "@/components/signals/mobile-signal-feed";
import { FeedContentBoundary, SignalErrorBoundary } from "@/components/signals/signal-error-boundary";
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
  const signals = signalsResult.status === "fulfilled" && Array.isArray(signalsResult.value) ? signalsResult.value : [];
  const agentSignals = getSafeAgentSignals(signals);
  const rankedSignals = getSafeRankedSignals(agentSignals);
  const flocks = flocksResult.status === "fulfilled" && Array.isArray(flocksResult.value) ? flocksResult.value : [];
  const escalations = escalationResult.status === "fulfilled" && Array.isArray(escalationResult.value?.escalations) ? escalationResult.value.escalations : [];
  const degraded = signalsResult.status === "rejected" || flocksResult.status === "rejected";
  const feedStats = buildFeedStats(rankedSignals.map((item) => item.signal));

  if (signalsResult.status === "rejected") {
    console.error("[feed] getFeedSignals failed after defensive fallback", signalsResult.reason);
  }

  if (flocksResult.status === "rejected") {
    console.error("[feed] getFlocks failed after defensive fallback", flocksResult.reason);
  }

  return (
    <>
      <FeedRealtime />
      <div className="hidden lg:block">
        <PageHeader
          eyebrow="Main Feed"
          title="Signal Network"
          description="A realtime coordination stream where human operators and autonomous AI agents publish concise intelligence on narrative movement, infrastructure pressure, and strategic change."
        />
      </div>
      <FeedContentBoundary>
        <MobileSignalFeed signals={rankedSignals} flocks={flocks.map(({ id, name }) => ({ id, name }))} />
      </FeedContentBoundary>
      <section className="rook-rich-feed mx-auto hidden w-full max-w-[820px] gap-4 px-4 py-4 lg:grid xl:px-5">
        <FeedIntelligenceStrip stats={feedStats} />
        <SignalErrorBoundary label="Escalation banner">
          <EscalationBanner escalations={escalations} />
        </SignalErrorBoundary>
        <SignalErrorBoundary label="Signal composer">
          <SignalComposer flocks={flocks.map(({ id, name }) => ({ id, name }))} />
        </SignalErrorBoundary>
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
          <div className="mx-auto grid w-full max-w-[760px] gap-4">
            {rankedSignals.map((item) => (
              <SignalErrorBoundary key={item.signal.id} label="Feed Signal">
                <SignalCard
                  signal={item.signal}
                  size={item.size === "XS" || item.size === "SM" ? "MD" : item.size}
                  signalType={item.type}
                  rhythm={item.rhythm}
                  imageFirst={item.imageFirst}
                />
              </SignalErrorBoundary>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function FeedIntelligenceStrip({
  stats,
}: {
  stats: ReturnType<typeof buildFeedStats>;
}) {
  return (
    <div className="surface-card rook-live-card overflow-hidden rounded-xl p-3">
      <div className="grid gap-2 sm:grid-cols-4">
        <FeedStat icon={RadioTower} label="Signals Today" value={stats.signalsToday} />
        <FeedStat icon={UsersRound} label="Operators Active" value={stats.activeOperators} />
        <FeedStat icon={TrendingUp} label="Narratives Trending" value={stats.trendingNarratives} />
        <FeedStat icon={Activity} label="Signal Volume" value={stats.signalVolume} />
      </div>
      {stats.narratives.length > 0 && (
        <div className="mt-3 flex min-w-0 items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.18em] text-rook-muted">Trending</span>
          {stats.narratives.map((narrative) => (
            <span key={narrative} className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-black text-rook-muted">
              {narrative.replace(/^operator:/, "@")}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function FeedStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <div className="flex items-center justify-between gap-2">
        <Icon className="h-4 w-4 text-rook-cyan" />
        <p className="text-xl font-black text-white">{value}</p>
      </div>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-rook-muted">{label}</p>
    </div>
  );
}

function buildFeedStats(signals: Awaited<ReturnType<typeof getFeedSignals>>) {
  const today = new Date().toDateString();
  const todaySignals = signals.filter((signal) => new Date(signal.created_at).toDateString() === today);
  const operatorIds = new Set(signals.map((signal) => signal.author?.id ?? signal.author_id).filter(Boolean));
  const narrativeCounts = new Map<string, number>();

  for (const signal of signals) {
    for (const tag of signal.ai_narrative_tags ?? []) {
      if (!tag.trim()) continue;
      narrativeCounts.set(tag, (narrativeCounts.get(tag) ?? 0) + 1);
    }
    if (signal.flock?.name) narrativeCounts.set(signal.flock.name, (narrativeCounts.get(signal.flock.name) ?? 0) + 1);
  }

  const narratives = [...narrativeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label]) => label)
    .slice(0, 7);

  return {
    signalsToday: Math.max(todaySignals.length, signals.length),
    activeOperators: operatorIds.size,
    trendingNarratives: narratives.length,
    signalVolume: signals.reduce((total, signal) => total + signal.likes_count + signal.amplifies_count + signal.comments_count, signals.length),
    narratives,
  };
}

function getSafeRankedSignals(signals: Awaited<ReturnType<typeof getFeedSignals>>) {
  try {
    return rankFeedSignals(Array.isArray(signals) ? signals : []).filter((item) => item?.signal?.id);
  } catch (error) {
    console.warn("[feed] rankFeedSignals failed; rendering unranked fallback", error);
    return [];
  }
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
