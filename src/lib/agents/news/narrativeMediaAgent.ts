import type { SignalWithAuthor } from "@/lib/supabase/types";
import type { NewsCategory, RookNewsSignal } from "@/lib/agents/news/sourceIngestionAgent";

export type NarrativeMedia = {
  media_type: "image" | "video" | "chart" | "ai_generated";
  media_url: string | null;
  thumbnail_url: string | null;
  visual_mode: SignalWithAuthor["visual_mode"];
  media_metadata: Record<string, unknown>;
};

const categoryVisualMode: Record<NewsCategory, NonNullable<SignalWithAuthor["visual_mode"]>> = {
  geopolitics: "geopolitics",
  AI: "science",
  markets: "financial",
  regulation: "intel",
  security: "cyber",
  infrastructure: "intel",
};

export class NarrativeMediaAgent {
  enrichSignals<T extends SignalWithAuthor>(signals: T[]): T[] {
    return signals.map((signal) => this.enrichSignal(signal));
  }

  enrichSignal<T extends SignalWithAuthor>(signal: T): T {
    const existing = this.resolveExistingMedia(signal);
    const media = existing ?? this.generateFallbackVisual(signal);

    return {
      ...signal,
      media_type: media.media_type,
      media_url: media.media_url,
      thumbnail_url: media.thumbnail_url,
      cover_image: signal.cover_image ?? media.thumbnail_url ?? null,
      thumbnail: signal.thumbnail ?? media.thumbnail_url ?? null,
      visual_mode: media.visual_mode,
      media_metadata: {
        ...(signal.media_metadata ?? {}),
        ...media.media_metadata,
        agent: "NarrativeMediaAgent",
      },
    };
  }

  resolveExistingMedia(signal: SignalWithAuthor): NarrativeMedia | null {
    const mediaUrl = firstString([
      signal.media_url,
      signal.image_url,
      signal.thumbnail_url,
      signal.cover_image,
      signal.thumbnail,
      signal.og_image,
      signal.chart_url,
      ...(signal.media_urls ?? []),
    ]);

    if (!mediaUrl) return null;

    return {
      media_type: signal.video_url ? "video" : signal.chart_url ? "chart" : "image",
      media_url: signal.video_url ?? mediaUrl,
      thumbnail_url: signal.thumbnail_url ?? signal.thumbnail ?? signal.cover_image ?? signal.og_image ?? mediaUrl,
      visual_mode: signal.visual_mode ?? "intel",
      media_metadata: { source: "existing_media", richness: 1 },
    };
  }

  generateFallbackVisual(signal: SignalWithAuthor): NarrativeMedia {
    const categories = getCategories(signal);
    const primary = categories[0] ?? "geopolitics";
    const velocity = readNumber((signal as Partial<RookNewsSignal>).narrative_velocity) ?? 50;
    const contradiction = signal.contradiction_score ?? 0;

    return {
      media_type: "ai_generated",
      media_url: null,
      thumbnail_url: null,
      visual_mode: categoryVisualMode[primary],
      media_metadata: {
        source: "fallback_visual",
        category: primary,
        categories,
        visual_system: "tactical-intelligence-card",
        prompt: buildVisualPrompt(primary, velocity, contradiction),
        richness: 0.72,
      },
    };
  }
}

export const narrativeMediaAgent = new NarrativeMediaAgent();

function getCategories(signal: SignalWithAuthor): NewsCategory[] {
  const record = signal as Partial<RookNewsSignal>;
  if (record.categories?.length) return record.categories;

  const text = `${signal.title} ${signal.body} ${(signal.ai_narrative_tags ?? []).join(" ")}`.toLowerCase();
  if (/\b(ai|model|compute|gpu|chip)\b/.test(text)) return ["AI"];
  if (/\b(market|yield|price|commodity|spread)\b/.test(text)) return ["markets"];
  if (/\b(policy|law|regulation|governance)\b/.test(text)) return ["regulation"];
  if (/\b(security|breach|threat|attack|disinformation)\b/.test(text)) return ["security"];
  if (/\b(power|grid|cloud|port|infrastructure)\b/.test(text)) return ["infrastructure"];
  return ["geopolitics"];
}

function buildVisualPrompt(category: NewsCategory, velocity: number, contradiction: number) {
  return [
    "Bloomberg and Palantir inspired dark intelligence terminal visual",
    `${category} narrative map`,
    `velocity ${velocity}`,
    `contradiction ${contradiction}`,
    "network lines, signal nodes, high contrast, media-first X card",
  ].join("; ");
}

function firstString(values: Array<unknown>) {
  return values.find((value): value is string => typeof value === "string" && value.trim().length > 0) ?? null;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
