import type { SignalWithAuthor } from "@/lib/supabase/types";

export type SignalEvidenceType = "source" | "image" | "chart" | "video" | "graph";

export type SignalEvidenceItem = {
  type: SignalEvidenceType;
  title: string;
  href: string;
  domain: string;
  credibility: number;
  timestamp: string;
  summary: string;
};

export type SignalEvidencePacket = {
  sourceTitle: string;
  sourceDomain: string;
  credibility: number;
  timestamp: string;
  evidenceType: SignalEvidenceType;
  items: SignalEvidenceItem[];
};

const TRUSTED_SOURCE_HINTS = [
  "gov",
  "edu",
  "standards",
  "sec.gov",
  "energy.gov",
  "nist.gov",
  "europa.eu",
  "arxiv.org",
  "github.com",
  "rook.local",
];

export function buildSignalEvidencePacket(signal: SignalWithAuthor): SignalEvidencePacket {
  const items = [
    buildEvidenceItem(signal, "source", signal.reference_url, "Primary source reference"),
    buildEvidenceItem(signal, "image", signal.image_url, "Image evidence"),
    buildEvidenceItem(signal, "chart", signal.chart_url, "Chart evidence"),
    buildEvidenceItem(signal, "video", signal.embed_url, "Embedded media evidence"),
    {
      type: "graph" as const,
      title: "Related Rook graph",
      href: `/graph?focus=${encodeURIComponent(signal.ai_narrative_tags?.[0] ?? signal.title)}`,
      domain: "rook.local",
      credibility: 82,
      timestamp: signal.created_at,
      summary: "Internal graph context derived from related Signals, topics, Flocks, and Pulse velocity.",
    },
  ].filter((item): item is SignalEvidenceItem => Boolean(item));

  const primary = items[0];

  return {
    sourceTitle: primary?.title ?? "Rook internal intelligence graph",
    sourceDomain: primary?.domain ?? "rook.local",
    credibility: primary?.credibility ?? deriveCredibility("rook.local"),
    timestamp: primary?.timestamp ?? signal.created_at,
    evidenceType: primary?.type ?? "graph",
    items,
  };
}

function buildEvidenceItem(
  signal: SignalWithAuthor,
  type: SignalEvidenceType,
  href: string | null | undefined,
  fallbackTitle: string,
): SignalEvidenceItem | null {
  if (!href) return null;

  const domain = getSourceDomain(href);
  return {
    type,
    title: getSourceTitle(href, fallbackTitle),
    href,
    domain,
    credibility: deriveCredibility(domain),
    timestamp: signal.created_at,
    summary: getEvidenceSummary(type, signal),
  };
}

function getEvidenceSummary(type: SignalEvidenceType, signal: SignalWithAuthor) {
  if (type === "chart") return "Structured quantitative context attached to the Signal.";
  if (type === "image") return "Visual evidence attached for inspection, not promotional media.";
  if (type === "video") return "Tactical media reference attached as supporting evidence.";
  if (type === "source") return `Source reference for ${signal.flock?.name ?? "the active narrative"}.`;
  return "Internal graph context derived from Rook activity.";
}

function getSourceTitle(href: string, fallbackTitle: string) {
  try {
    const parsed = new URL(href, "https://rook.local");
    const segments = parsed.pathname.split("/").filter(Boolean);
    const lastSegment = segments[segments.length - 1];
    return lastSegment ? decodeURIComponent(lastSegment).replace(/[-_]/g, " ").slice(0, 64) : fallbackTitle;
  } catch {
    return fallbackTitle;
  }
}

export function getSourceDomain(href: string) {
  try {
    return new URL(href, "https://rook.local").hostname.replace(/^www\./, "");
  } catch {
    return "rook.local";
  }
}

export function deriveCredibility(domain: string) {
  const normalized = domain.toLowerCase();
  const trusted = TRUSTED_SOURCE_HINTS.some((hint) => normalized.includes(hint));
  if (trusted) return 86;
  if (normalized === "rook.local") return 82;
  if (normalized.endsWith(".org")) return 78;
  if (normalized.endsWith(".com")) return 70;
  return 64;
}
