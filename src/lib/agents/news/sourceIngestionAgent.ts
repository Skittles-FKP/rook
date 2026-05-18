import type { SignalWithAuthor } from "@/lib/supabase/types";

export type NewsCategory =
  | "geopolitics"
  | "AI"
  | "markets"
  | "regulation"
  | "security"
  | "infrastructure";

export type NewsMediaType =
  | "image"
  | "thumbnail"
  | "video"
  | "graph_snapshot"
  | "ai_generated"
  | "source_screenshot";

export type SourceIngestionInput = {
  id?: string;
  title: string;
  summary?: string;
  content?: string;
  source_url?: string;
  source_name?: string;
  source_preview?: string;
  published_at?: string;
  categories?: NewsCategory[];
  tags?: string[];
  media?: Array<Record<string, unknown>>;
  media_type?: NewsMediaType;
  image_url?: string;
  thumbnail_url?: string;
  operator?: string;
  operator_handle?: string;
};

export type RookNewsSignal = SignalWithAuthor & {
  summary: string;
  content: string;
  operator: string;
  operator_handle: string;
  operator_avatar: string | null;
  narrative_velocity: number;
  propagation_score: number;
  tags: string[];
  categories: NewsCategory[];
  source_url: string | null;
  source_name: string | null;
  source_preview: string | null;
  engagement: {
    replies: number;
    boosts: number;
    bookmarks: number;
    views: number;
  };
  trend_direction: "accelerating" | "rising" | "stable" | "cooling";
  graph_data: {
    nodes: number;
    edges: number;
    clusters: string[];
  };
  ai_summary: string;
  references: Array<{ title: string; url: string; source: string }>;
  related_signals: string[];
};

type SourceKind = "rss" | "api" | "narrative" | "internal" | "mock";

export type SourceIngestionBatch = {
  kind: SourceKind;
  sourceName: string;
  items: SourceIngestionInput[];
};

const operators = {
  geopolitics: { name: "Policy Watch", handle: "policy_watch", id: "00000000-0000-4999-8999-000000000003" },
  AI: { name: "Compute Radar", handle: "compute_radar", id: "00000000-0000-4999-8999-000000000002" },
  markets: { name: "News Sentinel", handle: "news_sentinel", id: "00000000-0000-4999-8999-000000000001" },
  regulation: { name: "Policy Watch", handle: "policy_watch", id: "00000000-0000-4999-8999-000000000003" },
  security: { name: "Narrative Engine", handle: "narrative_engine", id: "00000000-0000-4999-8999-000000000005" },
  infrastructure: { name: "Infra Watch", handle: "infra_watch", id: "00000000-0000-4999-8999-000000000004" },
} satisfies Record<NewsCategory, { name: string; handle: string; id: string }>;

export class SourceIngestionAgent {
  ingest(batches: SourceIngestionBatch[], now = new Date()): RookNewsSignal[] {
    return batches.flatMap((batch, batchIndex) =>
      batch.items.map((item, itemIndex) => this.normalize(item, batch, batchIndex, itemIndex, now)),
    );
  }

  normalize(
    item: SourceIngestionInput,
    batch: SourceIngestionBatch,
    batchIndex = 0,
    itemIndex = 0,
    now = new Date(),
  ): RookNewsSignal {
    const categories = item.categories?.length ? item.categories : classifyCategories(item);
    const primaryCategory = categories[0] ?? "geopolitics";
    const operator = resolveOperator(item, primaryCategory);
    const publishedAt = item.published_at ?? new Date(now.getTime() - (batchIndex * 7 + itemIndex + 1) * 9 * 60_000).toISOString();
    const title = item.title.trim();
    const summary = item.summary?.trim() || summarize(item.content || title);
    const velocity = clamp(42 + primaryCategory.length * 3 + title.length % 37 + itemIndex * 4, 25, 98);
    const propagation = clamp(38 + velocity * 0.55 + (item.tags?.length ?? 0) * 4, 20, 99);
    const contradiction = clamp(titleConflictScore(title, item.content ?? summary), 4, 88);
    const confidence = clamp(72 + (batch.kind === "rss" ? 8 : 0) + (item.source_url ? 7 : 0) - Math.round(contradiction / 6), 42, 97);
    const tags = [...new Set([...(item.tags ?? []), ...categories.map((category) => category.toLowerCase())])];

    return {
      id: item.id ?? `news-${batch.kind}-${slugify(title)}-${publishedAt.slice(11, 16).replace(":", "")}`,
      author_id: operator.id,
      operator_id: operator.id,
      flock_id: null,
      title,
      body: buildBody(summary, item.content, item.source_name ?? batch.sourceName),
      summary,
      content: item.content?.trim() || summary,
      operator: operator.name,
      operator_handle: operator.handle,
      operator_avatar: null,
      narrative_velocity: velocity,
      contradiction_score: contradiction,
      confidence_score: confidence,
      propagation_score: propagation,
      tags,
      categories,
      media: item.media ?? [],
      media_type: normalizeMediaType(item.media_type),
      media_url: null,
      media_urls: [],
      thumbnail_url: item.thumbnail_url ?? null,
      image_url: item.image_url ?? null,
      video_url: null,
      chart_url: null,
      embed_url: null,
      reference_url: item.source_url ?? null,
      source_url: item.source_url ?? null,
      source_name: item.source_name ?? batch.sourceName,
      source_preview: item.source_preview ?? summary,
      engagement: {
        replies: Math.round(propagation / 7),
        boosts: Math.round(velocity / 5),
        bookmarks: Math.round(confidence / 6),
        views: Math.round(propagation * velocity * 18),
      },
      trend_direction: velocity > 80 ? "accelerating" : velocity > 62 ? "rising" : velocity > 40 ? "stable" : "cooling",
      graph_data: {
        nodes: Math.max(4, categories.length * 3 + tags.length),
        edges: Math.max(5, categories.length * tags.length + Math.round(propagation / 9)),
        clusters: categories,
      },
      ai_summary: `Rook detects ${categories.join(" / ")} narrative movement with ${confidence}% confidence and ${propagation}% propagation pressure.`,
      references: item.source_url ? [{ title, url: item.source_url, source: item.source_name ?? batch.sourceName }] : [],
      related_signals: [],
      cover_image: item.image_url ?? item.thumbnail_url ?? null,
      thumbnail: item.thumbnail_url ?? item.image_url ?? null,
      visual_mode: getVisualMode(primaryCategory),
      attachments: [],
      og_title: title,
      og_description: summary,
      og_image: item.image_url ?? item.thumbnail_url ?? null,
      media_metadata: { agent: "SourceIngestionAgent", sourceKind: batch.kind, categories, tags },
      ai_narrative_tags: tags,
      sentiment_overlay: null,
      likes_count: Math.round(propagation / 4),
      amplifies_count: Math.round(velocity / 4),
      comments_count: Math.round(contradiction / 8),
      created_at: publishedAt,
      updated_at: publishedAt,
      author: {
        id: operator.id,
        username: operator.handle,
        display_name: operator.name,
        avatar_url: null,
        operator_type: "autonomous",
        autonomous_status: "monitoring",
        expertise_domains: categories,
        reputation_score: confidence,
        pulse_influence_score: propagation,
      },
      flock: null,
      viewer_has_liked: false,
      viewer_has_amplified: false,
    };
  }
}

export const sourceIngestionAgent = new SourceIngestionAgent();

export function getMockIntelligenceBatches(): SourceIngestionBatch[] {
  return [
    {
      kind: "rss",
      sourceName: "Rook World Wire",
      items: [
        {
          title: "Red Sea insurance spreads widen after shipping reroutes accelerate",
          summary: "Marine risk desks are repricing weekly coverage as rerouted container traffic creates a secondary pressure point in European port schedules.",
          source_url: "https://example.com/red-sea-shipping-risk",
          source_name: "Rook World Wire",
          categories: ["geopolitics", "markets", "infrastructure"],
          tags: ["shipping", "risk-premium", "energy"],
        },
        {
          title: "Open model release triggers renewed compute capacity debate",
          summary: "Developer uptake is moving faster than hosting capacity, pulling GPU rental pricing and power availability into the same narrative cluster.",
          source_url: "https://example.com/open-model-compute",
          source_name: "Compute Desk",
          categories: ["AI", "infrastructure", "markets"],
          tags: ["open-models", "gpu", "power"],
        },
      ],
    },
    {
      kind: "internal",
      sourceName: "Rook Narrative Memory",
      items: [
        {
          title: "AI governance language shifts from safety pledges to procurement controls",
          summary: "Policy actors are converging around buyer-side controls, audit rights, and model provenance instead of broad voluntary safety language.",
          categories: ["regulation", "AI", "geopolitics"],
          tags: ["procurement", "model-provenance", "audit"],
        },
        {
          title: "Cloud outage chatter begins linking identity providers and payment rails",
          summary: "Security operators are watching whether a narrow SaaS degradation becomes a wider reliability narrative across authentication and checkout systems.",
          categories: ["security", "infrastructure"],
          tags: ["cloud", "identity", "payments"],
        },
      ],
    },
    {
      kind: "mock",
      sourceName: "Mock Intelligence Stream",
      items: [
        {
          title: "Copper and data center power stories merge in market commentary",
          summary: "Commodity desks are treating grid queue delays as an AI infrastructure bottleneck, pulling metals, utilities, and hyperscaler capex into one live thread.",
          categories: ["markets", "AI", "infrastructure"],
          tags: ["copper", "grid", "capex"],
        },
        {
          title: "Disinformation cluster pivots from election claims to migration pressure",
          summary: "Narrative tracking shows overlapping account sets reusing visual assets across two issue areas within a six-hour window.",
          categories: ["security", "geopolitics"],
          tags: ["disinformation", "migration", "visual-forensics"],
        },
      ],
    },
  ];
}

function resolveOperator(item: SourceIngestionInput, category: NewsCategory) {
  if (item.operator && item.operator_handle) {
    return { name: item.operator, handle: item.operator_handle, id: `agent-${item.operator_handle}` };
  }

  return operators[category];
}

function normalizeMediaType(value: NewsMediaType | undefined): SignalWithAuthor["media_type"] {
  if (value === "video") return "video";
  if (value === "image" || value === "thumbnail") return "image";
  if (value === "graph_snapshot") return "chart";
  if (value === "ai_generated" || value === "source_screenshot") return "ai_generated";
  return null;
}

function getVisualMode(category: NewsCategory): SignalWithAuthor["visual_mode"] {
  if (category === "AI") return "science";
  if (category === "markets") return "financial";
  if (category === "security") return "cyber";
  if (category === "geopolitics") return "geopolitics";
  return "intel";
}

function classifyCategories(item: SourceIngestionInput): NewsCategory[] {
  const text = `${item.title} ${item.summary ?? ""} ${item.content ?? ""}`.toLowerCase();
  const categories: NewsCategory[] = [];
  if (/\b(state|military|election|border|shipping|diplomacy|migration)\b/.test(text)) categories.push("geopolitics");
  if (/\b(ai|model|compute|gpu|chip|agent)\b/.test(text)) categories.push("AI");
  if (/\b(market|yield|stock|price|commodity|spread|capex)\b/.test(text)) categories.push("markets");
  if (/\b(policy|law|regulation|governance|audit|procurement)\b/.test(text)) categories.push("regulation");
  if (/\b(security|breach|identity|threat|disinformation|attack)\b/.test(text)) categories.push("security");
  if (/\b(power|grid|cloud|rail|port|infrastructure|data center)\b/.test(text)) categories.push("infrastructure");
  return categories.length ? categories : ["geopolitics"];
}

function buildBody(summary: string, content: string | undefined, source: string) {
  const detail = content?.trim() || summary;
  return `What changed: ${summary}\n\nWhy it matters: ${detail}\n\nSource intelligence: ${source}`;
}

function summarize(value: string) {
  return value.length > 180 ? `${value.slice(0, 177).trim()}...` : value;
}

function titleConflictScore(title: string, content: string) {
  const text = `${title} ${content}`.toLowerCase();
  let score = 12;
  if (/\b(contradict|denies|dispute|conflict|false|unclear)\b/.test(text)) score += 34;
  if (/\b(breaking|critical|outage|risk|threat)\b/.test(text)) score += 18;
  return score + (title.length % 17);
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 42);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}
