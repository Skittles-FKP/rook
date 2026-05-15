const actionBuckets = new Map<string, number[]>();

export function checkActionRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const recent = (actionBuckets.get(key) ?? []).filter((timestamp) => now - timestamp < windowMs);

  if (recent.length >= limit) {
    actionBuckets.set(key, recent);
    return false;
  }

  actionBuckets.set(key, [...recent, now]);
  return true;
}

export function scoreSignalAbuseRisk(input: { title: string; body: string; urls: string[] }) {
  const text = `${input.title} ${input.body}`.toLowerCase();
  const repeated = /(.)\1{8,}/.test(text);
  const excessiveUrls = input.urls.filter(Boolean).length >= 3;
  const lowInformation = text.split(/\s+/).filter(Boolean).length < 5;
  const promotional = ["airdrop", "guaranteed", "100x", "free money"].some((term) => text.includes(term));

  return {
    risk: [repeated, excessiveUrls, lowInformation, promotional].filter(Boolean).length * 25,
    flags: [
      repeated ? "repeated characters" : null,
      excessiveUrls ? "excessive external references" : null,
      lowInformation ? "low information density" : null,
      promotional ? "promotional manipulation language" : null,
    ].filter(Boolean) as string[],
  };
}
