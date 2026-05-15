import type { PulseCluster } from "@/lib/pulse";

export type GeneratedBrief = {
  summary: string;
  narratives: string[];
  contradictions: string[];
  consensus_shifts: string[];
  sentiment_movement: string;
  flock_summary: string;
};

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

function parseBriefPayload(content: string): GeneratedBrief {
  const parsed = JSON.parse(content) as Partial<GeneratedBrief>;

  return {
    summary: String(parsed.summary ?? ""),
    narratives: Array.isArray(parsed.narratives) ? parsed.narratives.map(String).slice(0, 5) : [],
    contradictions: Array.isArray(parsed.contradictions)
      ? parsed.contradictions.map(String).slice(0, 5)
      : [],
    consensus_shifts: Array.isArray(parsed.consensus_shifts)
      ? parsed.consensus_shifts.map(String).slice(0, 5)
      : [],
    sentiment_movement: String(parsed.sentiment_movement ?? "No clear sentiment movement detected."),
    flock_summary: String(parsed.flock_summary ?? "No Flock concentration detected."),
  };
}

export async function generateBriefFromCluster(cluster: PulseCluster): Promise<GeneratedBrief> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_BRIEF_MODEL ?? "gpt-4o-mini";

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const sourceSignals = cluster.signals.slice(0, 8).map((signal) => ({
    title: signal.title,
    body: signal.body,
    flock: signal.flock?.name ?? "Unassigned",
    author: signal.author?.username ?? "unknown",
    metrics: {
      likes: signal.likes_count,
      amplifies: signal.amplifies_count,
      comments: signal.comments_count,
      velocity: signal.velocity,
      pulse_score: signal.pulse_score,
    },
  }));

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You generate concise executive intelligence briefs for Rook. Use only supplied Signals. Do not invent facts. Return valid JSON with keys: summary, narratives, contradictions, consensus_shifts, sentiment_movement, flock_summary.",
        },
        {
          role: "user",
          content: JSON.stringify({
            cluster: {
              title: cluster.title,
              terms: cluster.terms,
              pulse_score: cluster.pulse_score,
              anomaly_score: cluster.anomaly_score,
              flock_count: cluster.flock_count,
            },
            sourceSignals,
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`AI brief generation failed (${response.status}): ${body.slice(0, 180)}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("AI provider returned an empty brief.");
  }

  return parseBriefPayload(content);
}
