import { getSafeHostname, isSafePublicUrl } from "@/lib/media";

export type OgMetadata = {
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
};

export async function fetchOgMetadata(url: string): Promise<OgMetadata> {
  try {
    const parsed = new URL(url);
    if (!isSafePublicUrl(parsed)) {
      return fallbackOg(url);
    }

    const response = await fetch(url, {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "RookSignalBot/1.0 (+https://rook.network)",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(3500),
    });

    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.includes("text/html")) {
      return fallbackOg(url);
    }

    const html = (await response.text()).slice(0, 180_000);
    return {
      ogTitle: readMeta(html, "og:title") ?? readTitle(html) ?? getSafeHostname(url),
      ogDescription: readMeta(html, "og:description") ?? readMeta(html, "description"),
      ogImage: absolutizeUrl(readMeta(html, "og:image") ?? readMeta(html, "twitter:image"), url),
    };
  } catch {
    return fallbackOg(url);
  }
}

function fallbackOg(url: string): OgMetadata {
  return {
    ogTitle: getSafeHostname(url),
    ogDescription: null,
    ogImage: null,
  };
}

function readMeta(html: string, key: string) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const propertyPattern = new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  const contentFirstPattern = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`, "i");
  return decodeHtml(propertyPattern.exec(html)?.[1] ?? contentFirstPattern.exec(html)?.[1] ?? null);
}

function readTitle(html: string) {
  return decodeHtml(/<title[^>]*>([^<]+)<\/title>/i.exec(html)?.[1] ?? null);
}

function decodeHtml(value: string | null) {
  if (!value) return null;
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim()
    .slice(0, 300);
}

function absolutizeUrl(value: string | null, base: string) {
  if (!value) return null;
  try {
    return new URL(value, base).toString();
  } catch {
    return null;
  }
}
