import type { SupabaseClient } from "@supabase/supabase-js";
import { seededAiOperators } from "@/lib/seeded-ai-activity";
import { logSupabaseQueryError, logSupabaseQueryException } from "@/lib/supabase/errors";
import type { Database } from "@/lib/supabase/types";

type CheckStatus = "ok" | "missing" | "error" | "skipped";

export type FeedReadinessCheck = {
  name: string;
  status: CheckStatus;
  detail: string;
};

export type FeedReadinessReport = {
  ok: boolean;
  checks: FeedReadinessCheck[];
};

const requiredChecks = [
  {
    migration: "0002",
    name: "profiles phase 3 columns",
    query: "profiles.select(expertise_domains,reputation_score,signal_accuracy_score,briefing_contribution_score,pulse_influence_score).limit(1)",
    run: (supabase: SupabaseClient<Database>) =>
      supabase
        .from("profiles")
        .select("expertise_domains, reputation_score, signal_accuracy_score, briefing_contribution_score, pulse_influence_score")
        .limit(1),
  },
  {
    migration: "0002",
    name: "briefs table",
    query: "briefs.select(id,cluster_key,source_signal_ids,status,generated_by).limit(1)",
    run: (supabase: SupabaseClient<Database>) =>
      supabase.from("briefs").select("id, cluster_key, source_signal_ids, status, generated_by").limit(1),
  },
  {
    migration: "0003",
    name: "signal intelligence columns",
    query: "signals.select(image_url,reference_url,chart_url,embed_url,confidence_score,ai_narrative_tags,contradiction_score,sentiment_overlay).limit(1)",
    run: (supabase: SupabaseClient<Database>) =>
      supabase
        .from("signals")
        .select("image_url, reference_url, chart_url, embed_url, confidence_score, ai_narrative_tags, contradiction_score, sentiment_overlay")
        .limit(1),
  },
  {
    migration: "0012",
    name: "signal operator metadata",
    query: "signals.select(operator_id,author_id,created_at).limit(1)",
    run: (supabase: SupabaseClient<Database>) =>
      supabase
        .from("signals")
        .select("operator_id, author_id, created_at")
        .limit(1),
  },
  {
    migration: "0005",
    name: "operator alerts table",
    query: "operator_alerts.select(id,user_id,source,title,severity,read_at).limit(1)",
    run: (supabase: SupabaseClient<Database>) =>
      supabase.from("operator_alerts").select("id, user_id, source, title, severity, read_at").limit(1),
  },
  {
    migration: "0005",
    name: "narrative contradiction graph table",
    query: "signal_contradictions.select(id,signal_a_id,signal_b_id,score,rationale).limit(1)",
    run: (supabase: SupabaseClient<Database>) =>
      supabase.from("signal_contradictions").select("id, signal_a_id, signal_b_id, score, rationale").limit(1),
  },
  {
    migration: "0005",
    name: "agent runs table",
    query: "agent_runs.select(id,agent_key,status,narrative_key,result_brief_id,error_message).limit(1)",
    run: (supabase: SupabaseClient<Database>) =>
      supabase.from("agent_runs").select("id, agent_key, status, narrative_key, result_brief_id, error_message").limit(1),
  },
  {
    migration: "graph",
    name: "signal contradiction FKs",
    query: "signal_contradictions.select(signal_a:signals!signal_contradictions_signal_a_id_fkey(id,title),signal_b:signals!signal_contradictions_signal_b_id_fkey(id,title)).limit(1)",
    run: (supabase: SupabaseClient<Database>) =>
      supabase
        .from("signal_contradictions")
        .select("id, signal_a:signals!signal_contradictions_signal_a_id_fkey(id, title), signal_b:signals!signal_contradictions_signal_b_id_fkey(id, title)")
        .limit(1),
  },
  {
    migration: "pulse",
    name: "Pulse likes source",
    query: "signal_likes.select(signal_id,user_id,created_at).limit(1)",
    run: (supabase: SupabaseClient<Database>) =>
      supabase.from("signal_likes").select("signal_id, user_id, created_at").limit(1),
  },
  {
    migration: "pulse",
    name: "Pulse amplifies source",
    query: "signal_amplifies.select(signal_id,user_id,created_at).limit(1)",
    run: (supabase: SupabaseClient<Database>) =>
      supabase.from("signal_amplifies").select("signal_id, user_id, created_at").limit(1),
  },
  {
    migration: "pulse",
    name: "Pulse comments source",
    query: "comments.select(id,signal_id,author_id,parent_comment_id,created_at).limit(1)",
    run: (supabase: SupabaseClient<Database>) =>
      supabase.from("comments").select("id, signal_id, author_id, parent_comment_id, created_at").limit(1),
  },
  {
    migration: "relations",
    name: "agent profile extension relation",
    query: "operator_profile_extensions.select(user_id,verification_status,specializations).limit(1)",
    run: (supabase: SupabaseClient<Database>) =>
      supabase.from("operator_profile_extensions").select("user_id, verification_status, specializations").limit(1),
  },
  {
    migration: "relations",
    name: "operator profile nested extensions",
    query: "profiles.select(id,username,extension:operator_profile_extensions!operator_profile_extensions_user_id_fkey(verification_status,specializations)).eq(operator_type,ai_agent).limit(1)",
    run: async (supabase: SupabaseClient<Database>) => {
      const result = await supabase
        .from("profiles")
        .select("id, username, extension:operator_profile_extensions!operator_profile_extensions_user_id_fkey(verification_status, specializations)")
        .in("operator_type", ["autonomous", "ai_agent"])
        .limit(1);

      return result;
    },
  },
  {
    migration: "0006",
    name: "workspaces table and FKs",
    query: "workspace_signals.select(id,organization_id,signal_id,visibility).limit(1)",
    run: (supabase: SupabaseClient<Database>) =>
      supabase.from("workspace_signals").select("id, organization_id, signal_id, visibility").limit(1),
  },
  {
    migration: "0006",
    name: "organizations table",
    query: "organizations.select(id,slug,created_by).limit(1)",
    run: (supabase: SupabaseClient<Database>) =>
      supabase.from("organizations").select("id, slug, created_by").limit(1),
  },
  {
    migration: "0007",
    name: "comment reply column",
    query: "comments.select(id,signal_id,author_id,parent_comment_id).limit(1)",
    run: (supabase: SupabaseClient<Database>) =>
      supabase.from("comments").select("id, signal_id, author_id, parent_comment_id").limit(1),
  },
  {
    migration: "0008",
    name: "AI operator profile columns",
    query: "profiles.select(operator_type,autonomous_status,source_domains_monitored,signal_frequency).limit(1)",
    run: (supabase: SupabaseClient<Database>) =>
      supabase.from("profiles").select("operator_type, autonomous_status, source_domains_monitored, signal_frequency").limit(1),
  },
  {
    migration: "0001",
    name: "feed read embedded FKs",
    query: "signals.select(author:profiles!signals_author_id_fkey(...),flock:flocks(...)).limit(1)",
    run: (supabase: SupabaseClient<Database>) =>
      supabase
        .from("signals")
        .select("id, author:profiles!signals_author_id_fkey(id, username), flock:flocks(id, slug)")
        .limit(1),
  },
  {
    migration: "0001",
    name: "comment author FK",
    query: "comments.select(author:profiles!comments_author_id_fkey(...)).limit(1)",
    run: (supabase: SupabaseClient<Database>) =>
      supabase
        .from("comments")
        .select("id, signal_id, author:profiles!comments_author_id_fkey(id, username)")
        .limit(1),
  },
  {
    migration: "RLS",
    name: "feed read policies",
    query: "signals/flocks/profiles public select smoke checks",
    run: async (supabase: SupabaseClient<Database>) => {
      const [signals, flocks, profiles] = await Promise.all([
        supabase.from("signals").select("id").limit(1),
        supabase.from("flocks").select("id").limit(1),
        supabase.from("profiles").select("id").limit(1),
      ]);
      return signals.error ?? flocks.error ?? profiles.error
        ? { data: null, error: signals.error ?? flocks.error ?? profiles.error }
        : { data: [], error: null };
    },
  },
  {
    migration: "RLS",
    name: "AI operator signal visibility",
    query: "profiles.select(id).in(operator_type,autonomous/ai_agent) -> signals.select(*).in(author_id, autonomous operator ids)",
    run: async (supabase: SupabaseClient<Database>) => {
      const operators = await supabase
        .from("profiles")
        .select("id, username, operator_type")
        .in("operator_type", ["autonomous", "ai_agent"]);

      if (operators.error) return operators;

      const ids = (operators.data ?? []).map((operator) => operator.id);
      if (ids.length === 0) {
        return {
          data: operators.data,
          error: {
            message: "No autonomous operator profiles visible to this client.",
            details: "RLS may be hiding profiles or autonomous operator bootstrap data is missing.",
            hint: "Check profiles SELECT policy and run autonomous operator seed/bootstrap.",
            code: "ROOK_AI_OPERATORS_NOT_VISIBLE",
          },
        };
      }

      const signals = await supabase
        .from("signals")
        .select("id, title, author_id, created_at, confidence_score, ai_narrative_tags")
        .in("author_id", ids)
        .order("created_at", { ascending: false })
        .limit(10);

      if (signals.error) return signals;

      return (signals.data ?? []).length === 0
        ? {
            data: signals.data,
            error: {
              message: "No AI-authored Signals visible to this client.",
              details: `Visible AI operator ids: ${ids.join(", ")}`,
              hint: "If service-role inserts succeed, check signals SELECT policy and author_id values.",
              code: "ROOK_AI_SIGNALS_NOT_VISIBLE",
            },
          }
        : signals;
    },
  },
  {
    migration: "seed",
    name: "seeded autonomous operators",
    query: "profiles.select(username,operator_type).in(username, seeded autonomous usernames)",
    run: async (supabase: SupabaseClient<Database>) => {
      const usernames = seededAiOperators.map((operator) => operator.username);
      const result = await supabase
        .from("profiles")
        .select("id, username, display_name, operator_type, autonomous_status, source_domains_monitored, signal_frequency")
        .in("username", usernames);

      if (result.error) return result;

      const found = new Set((result.data ?? []).map((row) => row.username));
      const missing = usernames.filter((username) => !found.has(username));
      const invalid = (result.data ?? []).filter((row) =>
        !["autonomous", "ai_agent"].includes(row.operator_type ?? "") ||
        !row.autonomous_status ||
        !row.signal_frequency ||
        !Array.isArray(row.source_domains_monitored),
      );

      return missing.length > 0
        ? {
            data: result.data,
            error: {
              message: `Missing seeded autonomous operators: ${missing.join(", ")}`,
              details: null,
              hint: "Run npm run seed:demo and apply supabase/seed/demo-seed.sql.",
              code: "ROOK_SEED_MISSING",
            },
          }
        : invalid.length > 0
          ? {
              data: result.data,
              error: {
                message: `Invalid seeded autonomous operator records: ${invalid.map((row) => row.username).join(", ")}`,
                details: "Expected operator_type=autonomous, autonomous_status, source_domains_monitored[], and signal_frequency.",
                hint: "Re-run npm run seed:demo and apply supabase/seed/demo-seed.sql after migration 0008.",
                code: "ROOK_SEED_INVALID",
              },
            }
        : result;
    },
  },
] as const;

export async function validateFeedReadiness(
  supabase: SupabaseClient<Database>,
): Promise<FeedReadinessReport> {
  const checks = await Promise.all(requiredChecks.map((check) => runReadinessCheck(supabase, check)));

  const report = {
    ok: checks.every((check) => check.status === "ok" || check.status === "skipped"),
    checks,
  };

  if (!report.ok) {
    console.error("[supabase:feed-readiness] validation failed", report);
  }

  return report;
}

async function runReadinessCheck(
  supabase: SupabaseClient<Database>,
  check: (typeof requiredChecks)[number],
): Promise<FeedReadinessCheck> {
  try {
    const result = await check.run(supabase);
    const error = "error" in result ? result.error : null;

    if (error) {
      logSupabaseQueryError("feed-readiness", `${check.migration}: ${check.query}`, error);
      return {
        name: `${check.migration} ${check.name}`,
        status: check.migration === "seed" ? "missing" : "error",
        detail: errorMessage(error),
      };
    }

    return {
      name: `${check.migration} ${check.name}`,
      status: "ok",
      detail: "validated",
    };
  } catch (error) {
    logSupabaseQueryException("feed-readiness", `${check.migration}: ${check.query}`, error);
    return {
      name: `${check.migration} ${check.name}`,
      status: "error",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? "Supabase validation failed.");
  }

  return String(error ?? "Supabase validation failed.");
}
