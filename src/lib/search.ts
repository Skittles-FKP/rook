import { getBriefs } from "@/lib/data/briefs";
import { getPulseSnapshot } from "@/lib/data/pulse";
import { getNarrativeSystem } from "@/lib/narratives";

export type SearchResultKind = "signal" | "brief" | "narrative" | "operator";

export type SearchResult = {
  id: string;
  kind: SearchResultKind;
  title: string;
  detail: string;
  score: number;
  href: string;
  tags: string[];
};

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}

function scoreText(queryTokens: string[], text: string) {
  const target = tokenize(text);
  if (queryTokens.length === 0) return 0;
  return queryTokens.reduce((score, token) => score + target.filter((candidate) => candidate.includes(token)).length, 0);
}

export async function semanticSearch(query: string): Promise<SearchResult[]> {
  const queryTokens = tokenize(query);
  const [pulse, briefs, narratives] = await Promise.all([getPulseSnapshot(72), getBriefs(), getNarrativeSystem()]);

  const signalResults = pulse.signals.slice(0, 60).map((signal): SearchResult => ({
    id: signal.id,
    kind: "signal",
    title: signal.title,
    detail: signal.body,
    score: scoreText(queryTokens, `${signal.title} ${signal.body} ${signal.topic_terms.join(" ")}`) + signal.pulse_score / 28,
    href: `/signals/${signal.id}`,
    tags: signal.topic_terms.slice(0, 4),
  }));

  const briefResults = briefs.map((brief): SearchResult => ({
    id: brief.id,
    kind: "brief",
    title: brief.title,
    detail: brief.summary ?? "Brief generation pending",
    score: scoreText(queryTokens, `${brief.title} ${brief.summary ?? ""} ${brief.narratives.join(" ")}`) + (brief.status === "ready" ? 4 : 1),
    href: `/briefs/${brief.id}`,
    tags: brief.narratives.slice(0, 4),
  }));

  const narrativeResults = narratives.map((narrative): SearchResult => ({
    id: narrative.id,
    kind: "narrative",
    title: narrative.title,
    detail: narrative.summary,
    score: scoreText(queryTokens, `${narrative.title} ${narrative.summary}`) + narrative.confidence_score / 20,
    href: `/narratives/${narrative.id}`,
    tags: narrative.cluster.terms.slice(0, 4),
  }));

  const operatorResults = pulse.signals
    .map((signal) => signal.author)
    .filter(Boolean)
    .filter((operator, index, operators) => operators.findIndex((item) => item?.id === operator?.id) === index)
    .map((operator): SearchResult => ({
      id: operator!.id,
      kind: "operator",
      title: operator!.display_name,
      detail: `@${operator!.username}`,
      score: scoreText(queryTokens, `${operator!.display_name} ${operator!.username}`) + 2,
      href: `/profile/${operator!.username}`,
      tags: ["operator"],
    }));

  return [...signalResults, ...briefResults, ...narrativeResults, ...operatorResults]
    .filter((result) => (queryTokens.length === 0 ? result.score > 3 : result.score > 0))
    .sort((a, b) => b.score - a.score)
    .slice(0, 24);
}

export function getEmbeddingReadiness() {
  return {
    providerConfigured: Boolean(process.env.OPENAI_API_KEY),
    vectorStoreConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    mode: process.env.OPENAI_API_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY ? "vector-ready" : "lexical-fallback",
  };
}
