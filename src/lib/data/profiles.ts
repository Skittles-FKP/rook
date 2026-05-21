import { getViewer } from "@/lib/data/signals";
import type { Profile, SignalWithAuthor } from "@/lib/supabase/types";

export type ProfileSummary = Profile & {
  followers_count: number;
  following_count: number;
  is_followed_by_viewer: boolean;
  signals: SignalWithAuthor[];
  expertise_domains: string[];
  reputation_score: number;
  signal_accuracy_score: number;
  briefing_contribution_score: number;
  pulse_influence_score: number;
  operator_type: "human" | "ai_agent" | "organization";
  autonomous_status: string | null;
  source_domains_monitored: string[];
  signal_frequency: string;
  credibility_score: number;
  narrative_influence_score: number;
  velocity_score: number;
  ai_stack_tags: string[];
  project_links: Array<Record<string, unknown>>;
  banner_url: string | null;
  verified_operator: boolean;
  is_premium: boolean;
  is_verified: boolean;
  verification_type: Profile["verification_type"];
  membership_tier: NonNullable<Profile["membership_tier"]>;
  membership_status: NonNullable<Profile["membership_status"]>;
};

export async function getProfileSummary(usernameOrId: string): Promise<ProfileSummary | null> {
  const { supabase, user } = await getViewer();
  if (!supabase) {
    return null;
  }

  const query = supabase.from("profiles").select("*");
  const { data: profile, error } = usernameOrId.includes("-")
    ? await query.eq("id", usernameOrId).maybeSingle()
    : await query.eq("username", usernameOrId).maybeSingle();

  if (error || !profile) {
    return null;
  }

  const [{ count: followersCount }, { count: followingCount }, { data: followed }, { data: signals }] =
    await Promise.all([
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", profile.id),
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", profile.id),
      user
        ? supabase
            .from("follows")
            .select("following_id")
            .eq("follower_id", user.id)
            .eq("following_id", profile.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("signals")
        .select(
          "*, author:profiles!signals_author_id_fkey(id, username, display_name, avatar_url, operator_type, autonomous_status), flock:flocks(id, name, slug)",
        )
        .eq("author_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  const operatorScores = deriveOperatorScores({
    signals: (signals ?? []) as unknown as SignalWithAuthor[],
    followers: followersCount ?? 0,
    following: followingCount ?? 0,
  });

  return {
    ...profile,
    operator_type: normalizeOperatorType(profile.operator_type),
    autonomous_status: profile.autonomous_status ?? deriveAutonomousStatus(profile.operator_type, (signals ?? []) as unknown as SignalWithAuthor[]),
    source_domains_monitored: deriveSourceDomains(profile, (signals ?? []) as unknown as SignalWithAuthor[]),
    signal_frequency: profile.signal_frequency ?? deriveSignalFrequency((signals ?? []) as unknown as SignalWithAuthor[]),
    credibility_score: readScore(profile.credibility_score, operatorScores.reputation_score),
    narrative_influence_score: readScore(profile.narrative_influence_score, operatorScores.pulse_influence_score),
    velocity_score: readScore(profile.velocity_score, operatorScores.signal_accuracy_score),
    ai_stack_tags: readStringArray(profile.ai_stack_tags).length > 0 ? readStringArray(profile.ai_stack_tags) : deriveAiStackTags(profile, (signals ?? []) as unknown as SignalWithAuthor[]),
    project_links: Array.isArray(profile.project_links) ? profile.project_links as Array<Record<string, unknown>> : [],
    banner_url: typeof profile.banner_url === "string" ? profile.banner_url : null,
    verified_operator: Boolean(profile.verified_operator || profile.is_verified || operatorScores.reputation_score >= 70),
    is_premium: Boolean(profile.is_premium || profile.membership_status === "active"),
    is_verified: Boolean(profile.is_verified || profile.verified_operator || operatorScores.reputation_score >= 70),
    verification_type: readVerificationType(profile.verification_type, profile.operator_type, Boolean(profile.verified_operator || profile.is_verified)),
    membership_tier: readMembershipTier(profile.membership_tier, profile.operator_type, Boolean(profile.is_premium)),
    membership_status: readMembershipStatus(profile.membership_status),
    followers_count: followersCount ?? 0,
    following_count: followingCount ?? 0,
    is_followed_by_viewer: Boolean(followed),
    signals: (signals ?? []) as unknown as SignalWithAuthor[],
    ...operatorScores,
  };
}

function readVerificationType(value: unknown, operatorType: Profile["operator_type"], verified: boolean): Profile["verification_type"] {
  if (value === "human" || value === "ai_operator" || value === "institution" || value === "analyst" || value === "premium") return value;
  if (!verified) return null;
  if (operatorType === "ai_agent" || operatorType === "autonomous") return "ai_operator";
  if (operatorType === "organization") return "institution";
  return "human";
}

function readMembershipTier(value: unknown, operatorType: Profile["operator_type"], premium: boolean): NonNullable<Profile["membership_tier"]> {
  if (value === "free" || value === "premium" || value === "analyst" || value === "ai_operator" || value === "institution") return value;
  if (operatorType === "ai_agent" || operatorType === "autonomous") return "ai_operator";
  if (operatorType === "organization") return "institution";
  return premium ? "premium" : "free";
}

function readMembershipStatus(value: unknown): NonNullable<Profile["membership_status"]> {
  return value === "active" || value === "trialing" || value === "past_due" || value === "canceled" || value === "expired" || value === "inactive"
    ? value
    : "inactive";
}

function readScore(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : fallback;
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function deriveAiStackTags(profile: Profile, signals: SignalWithAuthor[]) {
  const text = [profile.bio, profile.specialization, ...signals.slice(0, 5).map((signal) => `${signal.title} ${signal.body}`)].join(" ").toLowerCase();
  const tags = [
    ["agents", /\bagent|autonomous|workflow\b/],
    ["evals", /\beval|benchmark|score|test\b/],
    ["inference", /\binference|gpu|latency|model\b/],
    ["security", /\bsecurity|risk|threat|incident\b/],
    ["research", /\bresearch|paper|lab\b/],
  ] as const;
  return tags.filter(([, pattern]) => pattern.test(text)).map(([tag]) => tag).slice(0, 5);
}

export async function getCurrentProfileSummary() {
  const { profile } = await getViewer();

  if (!profile) {
    return null;
  }

  return getProfileSummary(profile.username);
}

export async function getOperatorDirectory() {
  const { supabase, user } = await getViewer();
  if (!supabase) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(36);

  if (!profiles) return [];

  const ids = profiles.map((profile) => profile.id);
  const [{ data: followed }, { data: signals }] = await Promise.all([
    user ? supabase.from("follows").select("following_id").eq("follower_id", user.id).in("following_id", ids) : Promise.resolve({ data: [] }),
    supabase
      .from("signals")
      .select("id, author_id, likes_count, amplifies_count, comments_count")
      .in("author_id", ids)
      .order("created_at", { ascending: false })
      .limit(240),
  ]);

  const followedSet = new Set((followed ?? []).map((item) => item.following_id));
  const signalsByAuthor = new Map<string, Array<{ likes_count: number; amplifies_count: number; comments_count: number }>>();

  for (const signal of signals ?? []) {
    signalsByAuthor.set(signal.author_id, [...(signalsByAuthor.get(signal.author_id) ?? []), signal]);
  }

  return profiles.map((profile) => {
    const operatorSignals = signalsByAuthor.get(profile.id) ?? [];
    const engagement = operatorSignals.reduce(
      (total, signal) => total + signal.likes_count + signal.amplifies_count * 2 + signal.comments_count * 1.5,
      0,
    );

    return {
      ...profile,
      operator_type: normalizeOperatorType(profile.operator_type),
      autonomous_status: profile.autonomous_status ?? deriveAutonomousStatus(profile.operator_type, []),
      source_domains_monitored: deriveSourceDomains(profile, []),
      signal_frequency: profile.signal_frequency ?? deriveSignalFrequency(operatorSignals as SignalWithAuthor[]),
      signals_count: operatorSignals.length,
      pulse_influence: Math.min(100, Math.round(engagement)),
      is_followed_by_viewer: followedSet.has(profile.id),
      expertise_domains: deriveOperatorScores({
        signals: [],
        followers: 0,
        following: 0,
      }).expertise_domains,
    };
  });
}

function normalizeOperatorType(value: Profile["operator_type"]): "human" | "ai_agent" | "organization" {
  return value === "ai_agent" || value === "organization" ? value : "human";
}

function deriveAutonomousStatus(value: Profile["operator_type"], signals: SignalWithAuthor[]) {
  if (value !== "ai_agent") return null;
  const latest = signals[0];
  if (!latest) return "standby";
  const ageHours = (Date.now() - new Date(latest.created_at).getTime()) / (1000 * 60 * 60);
  return ageHours < 24 ? "monitoring" : "standby";
}

function deriveSourceDomains(profile: Profile, signals: SignalWithAuthor[]) {
  const configured = profile.source_domains_monitored ?? [];
  if (configured.length > 0) return configured;

  const domains = new Set<string>();
  for (const signal of signals) {
    if (signal.flock?.name) domains.add(signal.flock.name);
  }

  if (domains.size > 0) return [...domains].slice(0, 5);
  if (profile.operator_type === "ai_agent") return ["Pulse activity", "Narrative drift", "Signal anomalies"];
  return [];
}

function deriveSignalFrequency(signals: SignalWithAuthor[]) {
  if (signals.length >= 14) return "high-frequency";
  if (signals.length >= 6) return "daily";
  if (signals.length >= 2) return "periodic";
  return "low-volume";
}

function deriveOperatorScores({
  signals,
  followers,
  following,
}: {
  signals: SignalWithAuthor[];
  followers: number;
  following: number;
}) {
  const interactionTotal = signals.reduce(
    (total, signal) => total + signal.likes_count + signal.amplifies_count * 2 + signal.comments_count * 1.5,
    0,
  );
  const pulseInfluence = Math.min(100, Math.round(interactionTotal + followers * 4));
  const reputation = Math.min(100, Math.round(35 + followers * 3 + signals.length * 2 + interactionTotal * 0.8));
  const accuracy = Math.min(
    100,
    Math.round(55 + signals.filter((signal) => signal.amplifies_count > 0).length * 7 + Math.min(following, 8)),
  );
  const briefing = Math.min(
    100,
    Math.round(signals.reduce((total, signal) => total + signal.comments_count + signal.amplifies_count, 0) * 4),
  );

  const domains = new Map<string, number>();
  for (const signal of signals) {
    if (signal.flock?.name) {
      domains.set(signal.flock.name, (domains.get(signal.flock.name) ?? 0) + 1);
    }
  }

  return {
    expertise_domains:
      [...domains.entries()].sort((a, b) => b[1] - a[1]).map(([domain]) => domain).slice(0, 4),
    reputation_score: reputation,
    signal_accuracy_score: accuracy,
    briefing_contribution_score: briefing,
    pulse_influence_score: pulseInfluence,
  };
}
