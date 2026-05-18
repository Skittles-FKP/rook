import { scorePulseSignal } from "@/lib/pulse";
import type { RookNewsSignal } from "@/lib/agents/news/sourceIngestionAgent";
import type { SignalWithAuthor } from "@/lib/supabase/types";

export type FeedRankingScore = {
  total: number;
  narrativeAcceleration: number;
  contradiction: number;
  recency: number;
  engagement: number;
  propagation: number;
  confidence: number;
  mediaRichness: number;
  balance: number;
};

export class FeedRankingAgent {
  rank<T extends SignalWithAuthor>(signals: T[]): Array<T & { ranking_score?: FeedRankingScore }> {
    const seenCategories = new Map<string, number>();
    const seenOperators = new Map<string, number>();
    const seenTitles = new Set<string>();

    return signals
      .map((signal) => ({ signal, score: this.score(signal, seenCategories, seenOperators, seenTitles) }))
      .sort((a, b) => b.score.total - a.score.total)
      .map(({ signal, score }) => ({ ...signal, ranking_score: score }));
  }

  score(
    signal: SignalWithAuthor,
    seenCategories = new Map<string, number>(),
    seenOperators = new Map<string, number>(),
    seenTitles = new Set<string>(),
  ): FeedRankingScore {
    const news = signal as Partial<RookNewsSignal>;
    const pulse = scorePulseSignal(signal);
    const categories = news.categories ?? signal.ai_narrative_tags ?? [];
    const operator = signal.author?.username ?? news.operator_handle ?? signal.operator_id ?? "unknown";
    const titleKey = normalizeTitle(signal.title);
    const duplicatePenalty = seenTitles.has(titleKey) ? -26 : 0;
    seenTitles.add(titleKey);

    const categoryPenalty = categories.reduce((sum, category) => sum + (seenCategories.get(category) ?? 0) * -2.5, 0);
    categories.forEach((category) => seenCategories.set(category, (seenCategories.get(category) ?? 0) + 1));

    const operatorPenalty = (seenOperators.get(operator) ?? 0) * -3;
    seenOperators.set(operator, (seenOperators.get(operator) ?? 0) + 1);

    const narrativeAcceleration = clamp((news.narrative_velocity ?? pulse.velocity * 18) * 0.85 + pulse.acceleration * 4, 0, 100);
    const contradiction = clamp((signal.contradiction_score ?? 0) * 0.72, 0, 72);
    const recency = clamp(32 - hoursSince(signal.created_at) * 2.2, 0, 32);
    const engagement = clamp(((signal.likes_count ?? 0) * 0.8 + (signal.amplifies_count ?? 0) * 1.7 + (signal.comments_count ?? 0) * 1.2 + (news.engagement?.bookmarks ?? 0)) / 2, 0, 46);
    const propagation = clamp((news.propagation_score ?? pulse.pulse_score) * 0.62, 0, 62);
    const confidence = clamp((signal.confidence_score ?? 55) * 0.36, 0, 36);
    const mediaRichness = getMediaRichness(signal);
    const balance = categoryPenalty + operatorPenalty + duplicatePenalty;
    const total = narrativeAcceleration + contradiction + recency + engagement + propagation + confidence + mediaRichness + balance;

    return {
      total: Math.round(total * 10) / 10,
      narrativeAcceleration,
      contradiction,
      recency,
      engagement,
      propagation,
      confidence,
      mediaRichness,
      balance,
    };
  }
}

export const feedRankingAgent = new FeedRankingAgent();

function getMediaRichness(signal: SignalWithAuthor) {
  if (signal.video_url) return 28;
  if (signal.image_url || signal.cover_image || signal.thumbnail || signal.thumbnail_url || signal.og_image) return 22;
  if (signal.chart_url || signal.media_type === "chart") return 20;
  if (signal.media_type === "ai_generated") return 15;
  if ((signal.media?.length ?? 0) > 0 || (signal.media_urls?.length ?? 0) > 0 || (signal.attachments?.length ?? 0) > 0) return 12;
  return 8;
}

function normalizeTitle(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 72);
}

function hoursSince(value: string) {
  const age = Date.now() - new Date(value).getTime();
  return Number.isFinite(age) ? Math.max(age / 36e5, 0) : 24;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
