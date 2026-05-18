import { feedRankingAgent } from "@/lib/agents/news/feedRankingAgent";
import { narrativeMediaAgent } from "@/lib/agents/news/narrativeMediaAgent";
import { getMockIntelligenceBatches, sourceIngestionAgent, type RookNewsSignal } from "@/lib/agents/news/sourceIngestionAgent";
import type { SignalWithAuthor } from "@/lib/supabase/types";

export class NewsFeedAgent {
  generateInitialFeed(existingSignals: SignalWithAuthor[], now = new Date()): SignalWithAuthor[] {
    const ingested = sourceIngestionAgent.ingest(getMockIntelligenceBatches(), now);
    const mediaReady = narrativeMediaAgent.enrichSignals([...existingSignals, ...ingested]);
    return feedRankingAgent.rank(mediaReady);
  }

  nextMockSignal(index: number, now = new Date()): RookNewsSignal {
    const batches = getMockIntelligenceBatches();
    const flatItems = batches.flatMap((batch) => batch.items.map((item) => ({ batch, item })));
    const selected = flatItems[index % flatItems.length];
    const signal = sourceIngestionAgent.normalize(
      {
        ...selected.item,
        id: `live-${index}-${now.getTime()}`,
        title: rotateHeadline(selected.item.title, index),
        published_at: now.toISOString(),
      },
      selected.batch,
      0,
      index,
      now,
    );

    return narrativeMediaAgent.enrichSignal({
      ...signal,
      likes_count: signal.likes_count + index * 2,
      amplifies_count: signal.amplifies_count + index,
      comments_count: signal.comments_count + (index % 4),
      narrative_velocity: Math.min(99, signal.narrative_velocity + (index % 5) * 3),
      propagation_score: Math.min(99, signal.propagation_score + (index % 6) * 2),
    });
  }
}

export const newsFeedAgent = new NewsFeedAgent();

function rotateHeadline(title: string, index: number) {
  const prefixes = ["Live", "Update", "Watch", "Signal", "Flash"];
  return `${prefixes[index % prefixes.length]}: ${title}`;
}
