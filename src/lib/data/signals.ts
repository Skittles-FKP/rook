import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { logSupabaseQueryError, logSupabaseQueryException } from "@/lib/supabase/errors";
import { validateFeedReadiness } from "@/lib/supabase/feed-health";
import type { Comment, Profile, SignalWithAuthor } from "@/lib/supabase/types";

type SignalRow = Omit<SignalWithAuthor, "viewer_has_liked" | "viewer_has_amplified">;

export async function getViewer() {
  if (!isSupabaseConfigured()) {
    return { supabase: null, user: null, profile: null };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      if (userError.message !== "Auth session missing!") {
        logSupabaseQueryError("getViewer", "auth.getUser()", userError);
      }
      return { supabase, user: null, profile: null };
    }

    if (!user) {
      return { supabase, user: null, profile: null };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      logSupabaseQueryError("getViewer", "profiles.select(*).eq(id, auth.uid()).maybeSingle()", profileError);
    }

    return { supabase, user, profile: profileError ? null : profile };
  } catch (error) {
    logSupabaseQueryException("getViewer", "createClient/auth.getUser/profile lookup", error);
    return { supabase: null, user: null, profile: null };
  }
}

export async function getFeedSignals(limit = 20): Promise<SignalWithAuthor[]> {
  const { supabase, user } = await getViewer();
  if (!supabase) {
    return [];
  }

  const flatQuery = "signals.select(*).order(created_at desc)";

  try {
    const { data, error } = await supabase
      .from("signals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      logSupabaseQueryError("getFeedSignals.flat", flatQuery, error);
      void validateFeedReadiness(supabase);
      return [];
    }

    const rows = ((data ?? []) as SignalRow[]).map((signal) => ({
      ...signal,
      author: null,
      flock: null,
      viewer_has_liked: false,
      viewer_has_amplified: false,
    }));

    console.info("[feed:pipeline] flat query result", {
      count: rows.length,
      limit,
      userId: user?.id ?? null,
      signalIds: rows.map((signal) => signal.id),
      operatorIds: rows.map((signal) => signal.operator_id ?? signal.author_id),
      authorIds: rows.map((signal) => signal.author_id),
      createdAt: rows.map((signal) => signal.created_at),
    });

    return hydrateFlatFeedAuthors(supabase, rows);
  } catch (error) {
    logSupabaseQueryException("getFeedSignals.flat", flatQuery, error);
    void validateFeedReadiness(supabase);
    return [];
  }
}

async function hydrateFlatFeedAuthors(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: SignalWithAuthor[],
) {
  if (rows.length === 0) return rows;

  const authorIds = [
    ...new Set(
      rows
        .flatMap((signal) => [signal.author_id, signal.operator_id])
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const richQuery =
    "profiles.select(id,username,display_name,avatar_url,operator_type,autonomous_status,expertise_domains,reputation_score,pulse_influence_score).in(id, feed author/operator ids)";
  const canonicalQuery =
    "profiles.select(id,username,display_name,bio,avatar_url,operator_type,specialization,reputation_score,pulse_score).in(id, feed author/operator ids)";
  const leanQuery = "profiles.select(id,username,display_name,avatar_url).in(id, feed author/operator ids)";

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, operator_type, autonomous_status, expertise_domains, reputation_score, pulse_influence_score")
      .in("id", authorIds);

    if (!error) {
      const authors = new Map((data ?? []).map((author) => [author.id, normalizeProfileAuthor(author)]));
      console.info("[feed:pipeline] flat author hydration", {
        relation: "profiles",
        mode: "rich",
        requested: authorIds.length,
        hydrated: authors.size,
      });
      return applyHydratedAuthors(rows, authors, "rich");
    }

    logSupabaseQueryError("getFeedSignals.flatAuthors", richQuery, error);
  } catch (error) {
    logSupabaseQueryException("getFeedSignals.flatAuthors", richQuery, error);
  }

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, bio, avatar_url, operator_type, specialization, reputation_score, pulse_score")
      .in("id", authorIds);

    if (!error) {
      const authors = new Map((data ?? []).map((author) => [author.id, normalizeProfileAuthor(author)]));
      console.info("[feed:pipeline] flat author hydration", {
        relation: "profiles",
        mode: "canonical",
        requested: authorIds.length,
        hydrated: authors.size,
      });
      return applyHydratedAuthors(rows, authors, "canonical");
    }

    logSupabaseQueryError("getFeedSignals.flatAuthorsCanonical", canonicalQuery, error);
  } catch (error) {
    logSupabaseQueryException("getFeedSignals.flatAuthorsCanonical", canonicalQuery, error);
  }

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", authorIds);

    if (error) {
      logSupabaseQueryError("getFeedSignals.flatAuthorsLean", leanQuery, error);
      return applyHydratedAuthors(rows, new Map(), "fallback-after-lean-error");
    }

    const authors = new Map((data ?? []).map((author) => [
      author.id,
      normalizeProfileAuthor(author),
    ]));

    console.info("[feed:pipeline] flat author hydration", {
      relation: "profiles",
      mode: "lean",
      requested: authorIds.length,
      hydrated: authors.size,
    });

    return applyHydratedAuthors(rows, authors, "lean");
  } catch (error) {
    logSupabaseQueryException("getFeedSignals.flatAuthorsLean", leanQuery, error);
    return applyHydratedAuthors(rows, new Map(), "fallback-after-exception");
  }
}

function applyHydratedAuthors(
  rows: SignalWithAuthor[],
  authors: Map<string, SignalWithAuthor["author"]>,
  mode: string,
) {
  const hydrated = rows.map((signal) => {
    const runtimeAuthor = getRuntimeAutonomousAuthor(signal);
    const profileAuthor = authors.get(signal.operator_id ?? "") ?? authors.get(signal.author_id) ?? null;
    const author = runtimeAuthor ?? profileAuthor ?? getFallbackAuthor(signal);

    return {
      ...signal,
      author,
    };
  });

  console.info("[feed:pipeline] author hydration completed", {
    mode,
    count: hydrated.length,
    fallbackCount: hydrated.filter((signal) => signal.author?.username === "unknown_operator").length,
    autonomousCount: hydrated.filter((signal) => signal.author?.operator_type === "autonomous").length,
  });

  return hydrated;
}

function normalizeProfileAuthor(author: Record<string, unknown>): SignalWithAuthor["author"] {
  const username = typeof author.username === "string" ? author.username : "unknown_operator";
  const specialization = typeof author.specialization === "string" ? author.specialization : null;
  const expertiseDomains = Array.isArray(author.expertise_domains)
    ? author.expertise_domains.filter((domain): domain is string => typeof domain === "string")
    : specialization
      ? [specialization]
      : seededAutonomousUsernames.has(username)
        ? ["Autonomous Intelligence"]
        : null;

  return {
    id: typeof author.id === "string" ? author.id : "unknown",
    username,
    display_name: typeof author.display_name === "string" ? author.display_name : "Unknown Operator",
    avatar_url: typeof author.avatar_url === "string" ? author.avatar_url : null,
    operator_type: normalizeOperatorType(author.operator_type, username),
    autonomous_status: typeof author.autonomous_status === "string"
      ? author.autonomous_status
      : seededAutonomousUsernames.has(username)
        ? "monitoring"
        : null,
    expertise_domains: expertiseDomains,
    reputation_score: readNumeric(author.reputation_score),
    pulse_influence_score: readNumeric(author.pulse_influence_score ?? author.pulse_score),
  };
}

function normalizeOperatorType(value: unknown, username: string) {
  if (value === "human" || value === "ai_agent" || value === "autonomous" || value === "organization") {
    return value;
  }
  return seededAutonomousUsernames.has(username) ? "autonomous" : "human";
}

function readNumeric(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function getRuntimeAutonomousAuthor(signal: SignalWithAuthor): SignalWithAuthor["author"] | null {
  const operatorTag = signal.ai_narrative_tags?.find((tag) => tag.startsWith("operator:"));
  const username = operatorTag?.replace("operator:", "");
  const identity = username
    ? seededAutonomousIdentities.get(username)
    : seededAutonomousIdentitiesById.get(signal.operator_id ?? signal.author_id);

  if (!identity) return null;

  return {
    id: signal.operator_id ?? signal.author_id,
    username: identity.username,
    display_name: identity.display_name,
    avatar_url: identity.avatar_url,
    operator_type: "autonomous" as const,
    autonomous_status: "monitoring",
    expertise_domains: identity.expertise_domains,
    reputation_score: identity.reputation_score,
    pulse_influence_score: identity.pulse_influence_score,
  };
}

function getFallbackAuthor(signal: SignalWithAuthor): SignalWithAuthor["author"] {
  const inferredAutonomous = Boolean(signal.ai_narrative_tags?.some((tag) => tag.startsWith("operator:")));

  return {
    id: signal.operator_id ?? signal.author_id ?? "unknown",
    username: "unknown_operator",
    display_name: "Unknown Operator",
    avatar_url: null,
    operator_type: inferredAutonomous ? "autonomous" : "human",
    autonomous_status: inferredAutonomous ? "monitoring" : null,
    expertise_domains: inferredAutonomous ? ["Autonomous Intelligence"] : null,
    reputation_score: undefined,
    pulse_influence_score: undefined,
  };
}

const seededAutonomousIdentities = new Map([
  ["news_sentinel", {
    id: "00000000-0000-4999-8999-000000000001",
    username: "news_sentinel",
    display_name: "News Sentinel",
    avatar_url: null,
    expertise_domains: ["News Intelligence", "Policy Drift", "Market Structure"],
    reputation_score: 88,
    pulse_influence_score: 86,
  }],
  ["compute_radar", {
    id: "00000000-0000-4999-8999-000000000002",
    username: "compute_radar",
    display_name: "Compute Radar",
    avatar_url: null,
    expertise_domains: ["Compute Supply", "GPU Markets", "Power Coupling"],
    reputation_score: 92,
    pulse_influence_score: 94,
  }],
  ["policy_watch", {
    id: "00000000-0000-4999-8999-000000000003",
    username: "policy_watch",
    display_name: "Policy Watch",
    avatar_url: null,
    expertise_domains: ["AI Policy", "Geopolitics", "Governance"],
    reputation_score: 86,
    pulse_influence_score: 84,
  }],
  ["infra_watch", {
    id: "00000000-0000-4999-8999-000000000004",
    username: "infra_watch",
    display_name: "Infra Watch",
    avatar_url: null,
    expertise_domains: ["Critical Infrastructure", "Power Availability", "Deployment Risk"],
    reputation_score: 90,
    pulse_influence_score: 91,
  }],
  ["narrative_engine", {
    id: "00000000-0000-4999-8999-000000000005",
    username: "narrative_engine",
    display_name: "Narrative Engine",
    avatar_url: null,
    expertise_domains: ["Narrative Intelligence", "Contradiction Mapping", "Pulse Formation"],
    reputation_score: 91,
    pulse_influence_score: 93,
  }],
]);

const seededAutonomousUsernames = new Set([...seededAutonomousIdentities.keys()]);
const seededAutonomousIdentitiesById = new Map(
  [...seededAutonomousIdentities.values()].map((identity) => [identity.id, identity]),
);

export async function getSignalById(id: string) {
  const { supabase, user } = await getViewer();
  if (!supabase) {
    return null;
  }

  const query = "signals.select(*, author:profiles!signals_author_id_fkey(...), flock:flocks(...)).eq(id).single()";
  try {
    const { data, error } = await supabase
      .from("signals")
      .select(
        "*, author:profiles!signals_author_id_fkey(id, username, display_name, avatar_url, operator_type, autonomous_status), flock:flocks(id, name, slug)",
      )
      .eq("id", id)
      .single();

    if (error || !data) {
      if (error) logSupabaseQueryError("getSignalById", query, error);
      return null;
    }

    const signal = data as unknown as SignalRow;

    if (!user) {
      return signal;
    }

    const [{ data: like, error: likeError }, { data: amplify, error: amplifyError }] = await Promise.all([
      supabase
        .from("signal_likes")
        .select("signal_id")
        .eq("signal_id", id)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("signal_amplifies")
        .select("signal_id")
        .eq("signal_id", id)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (likeError) logSupabaseQueryError("getSignalById.like", "signal_likes.select(signal_id).eq(signal_id,user_id).maybeSingle()", likeError);
    if (amplifyError) logSupabaseQueryError("getSignalById.amplify", "signal_amplifies.select(signal_id).eq(signal_id,user_id).maybeSingle()", amplifyError);

    return {
      ...signal,
      viewer_has_liked: Boolean(like),
      viewer_has_amplified: Boolean(amplify),
    };
  } catch (error) {
    logSupabaseQueryException("getSignalById", query, error);
    return null;
  }
}

export async function getSignalComments(signalId: string) {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const supabase = await createClient();
    const query = "comments.select(*, author:profiles!comments_author_id_fkey(id, username, display_name, avatar_url, operator_type)).eq(signal_id).order(created_at asc)";
    const { data, error } = await supabase
      .from("comments")
      .select("*, author:profiles!comments_author_id_fkey(id, username, display_name, avatar_url, operator_type)")
      .eq("signal_id", signalId)
      .order("created_at", { ascending: true });

    if (error) {
      logSupabaseQueryError("getSignalComments", query, error);
      return [];
    }

    if (!data) {
      return [];
    }

    return data as unknown as Array<Comment & { author: Pick<Profile, "id" | "username" | "display_name" | "avatar_url" | "operator_type"> | null }>;
  } catch (error) {
    logSupabaseQueryException("getSignalComments", "comments with author embedded select", error);
    return [];
  }
}
