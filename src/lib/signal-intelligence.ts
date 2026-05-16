import { extractTopicTerms, scorePulseSignal, type PulseSignal } from "@/lib/pulse";
import type { SignalWithAuthor } from "@/lib/supabase/types";

export type SignalIntelligence = {
  confidence: number;
  narrative_tags: string[];
  contradiction_score: number;
  sentiment: "Constructive" | "Divergent" | "Neutral" | "Volatile";
  velocity_history: number[];
};

export function getSignalIntelligence(signal: SignalWithAuthor | PulseSignal): SignalIntelligence {
  const pulse = "pulse_score" in signal ? signal : scorePulseSignal(signal);
  const terms = Array.isArray(pulse.topic_terms) && pulse.topic_terms.length > 0 ? pulse.topic_terms : extractTopicTerms(pulse);
  const amplifies = typeof pulse.amplifies_count === "number" ? pulse.amplifies_count : 0;
  const comments = typeof pulse.comments_count === "number" ? pulse.comments_count : 0;
  const confidence = Math.min(
    98,
    Math.round(52 + amplifies * 7 + comments * 3 + (pulse.flock ? 8 : 0)),
  );
  const contradictionScore = Math.min(
    100,
    Math.round(pulse.comment_velocity * 18 + (pulse.anomaly_score > 4 ? 18 : 0)),
  );
  const sentiment =
    pulse.anomaly_score > 8
      ? "Volatile"
      : contradictionScore > 35
        ? "Divergent"
        : pulse.amplification_velocity > pulse.comment_velocity
          ? "Constructive"
          : "Neutral";

  return {
    confidence,
    narrative_tags: terms.slice(0, 4),
    contradiction_score: contradictionScore,
    sentiment,
    velocity_history: [
      Math.max(0, Number((pulse.velocity * 0.38).toFixed(2))),
      Math.max(0, Number((pulse.velocity * 0.54).toFixed(2))),
      Math.max(0, Number((pulse.velocity * 0.78).toFixed(2))),
      pulse.velocity,
    ],
  };
}
