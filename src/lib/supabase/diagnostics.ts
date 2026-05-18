import { getSupabaseEnvDiagnostics } from "@/lib/supabase/env";
import { normalizeSupabaseError } from "@/lib/supabase/errors";

function shouldLogSupabaseDiagnostics() {
  return process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_SUPABASE_DEBUG === "1";
}

function describeFetchTarget(input: Parameters<typeof fetch>[0]) {
  const url = typeof input === "string" || input instanceof URL ? String(input) : input.url;

  try {
    const parsed = new URL(url);
    const source = describePostgrestQuery(parsed);
    return {
      url: parsed.toString(),
      hostname: parsed.hostname,
      pathname: parsed.pathname,
      search: parsed.search,
      ...source,
    };
  } catch {
    return { url, hostname: "invalid-url", pathname: "", search: "", querySource: "unknown", table: null, selectPayload: null, nestedRelations: [], filters: [] };
  }
}

function describePostgrestQuery(url: URL) {
  const table = url.pathname.startsWith("/rest/v1/")
    ? decodeURIComponent(url.pathname.replace("/rest/v1/", "").split("/")[0] ?? "")
    : null;
  const selectPayload = url.searchParams.get("select");
  const filters = [...url.searchParams.entries()]
    .filter(([key]) => !["select", "order", "limit", "offset"].includes(key))
    .map(([key, value]) => `${key}=${value}`);

  return {
    querySource: table ? "postgrest" : "supabase",
    table,
    selectPayload,
    nestedRelations: selectPayload ? extractNestedRelations(selectPayload) : [],
    filters,
  };
}

function extractNestedRelations(selectPayload: string) {
  const relations: Array<{ alias: string | null; relation: string; fk: string | null; payload: string }> = [];
  const pattern = /(?:^|,)\s*(?:([a-zA-Z0-9_]+):)?([a-zA-Z0-9_]+)(?:!([a-zA-Z0-9_]+))?\(([^()]*)\)/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(selectPayload)) !== null) {
    const [, alias, relation, fk, payload] = match;
    if (!relation || relation === "count") continue;
    relations.push({
      alias: alias ?? null,
      relation,
      fk: fk ?? null,
      payload,
    });
  }

  return relations;
}

export function logSupabaseEnvDiagnostics(context: string) {
  if (!shouldLogSupabaseDiagnostics()) {
    return;
  }

  console.info(`[supabase:${context}] env`, getSupabaseEnvDiagnostics());
}

export async function diagnosticFetch(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
) {
  const target = describeFetchTarget(input);

  if (shouldLogSupabaseDiagnostics()) {
      console.info("[supabase:fetch] request", {
        method: init?.method ?? (typeof input === "object" && "method" in input ? input.method : "GET"),
        hostname: target.hostname,
        pathname: target.pathname,
        search: target.search,
        querySource: target.querySource,
        table: target.table,
        selectPayload: target.selectPayload,
        nestedRelations: target.nestedRelations,
        filters: target.filters,
      });
  }

  try {
    const response = await fetch(input, init);

    if (shouldLogSupabaseDiagnostics()) {
      console.info("[supabase:fetch] response", {
        status: response.status,
        hostname: target.hostname,
        pathname: target.pathname,
        search: target.search,
        querySource: target.querySource,
        table: target.table,
        selectPayload: target.selectPayload,
        nestedRelations: target.nestedRelations,
        filters: target.filters,
      });
    }

    if (!response.ok) {
      let body = "";
      let parsed: unknown = null;

      try {
        body = await response.clone().text();
        parsed = body ? JSON.parse(body) : null;
      } catch (error) {
        if (!body) {
          body = `Unable to read Supabase error body: ${error instanceof Error ? error.message : String(error)}`;
        }
      }

      const extracted = parsed ? normalizeSupabaseError(parsed) : null;

      console.error("[supabase:fetch] error response", {
        operation: init?.method ?? (typeof input === "object" && "method" in input ? input.method : "GET"),
        status: response.status,
        statusText: response.statusText,
        hostname: target.hostname,
        pathname: target.pathname,
        search: target.search,
        querySource: target.querySource,
        table: target.table,
        selectPayload: target.selectPayload,
        nestedRelations: target.nestedRelations,
        filters: target.filters,
        message: extracted?.message,
        details: extracted?.details,
        hint: extracted?.hint,
        code: extracted?.code,
        errorTable: extracted?.table,
        errorColumn: extracted?.column,
        errorRelation: extracted?.relation,
        body,
        parsedBody: parsed,
        authState: describeAuthHeaders(init?.headers),
      });
    }

    return response;
  } catch (error) {
    console.error("[supabase:fetch] failed", {
      hostname: target.hostname,
      pathname: target.pathname,
      search: target.search,
      querySource: target.querySource,
      table: target.table,
      selectPayload: target.selectPayload,
      nestedRelations: target.nestedRelations,
      filters: target.filters,
      error: error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
            cause: error.cause,
          }
        : error,
    });

    throw error;
  }
}

function describeAuthHeaders(headers: HeadersInit | undefined) {
  if (!headers) {
    return { hasAuthorizationHeader: false, hasApiKeyHeader: false };
  }

  const normalized = new Headers(headers);
  const authorization = normalized.get("authorization");
  const apiKey = normalized.get("apikey");

  return {
    hasAuthorizationHeader: Boolean(authorization),
    hasApiKeyHeader: Boolean(apiKey),
    authorizationPrefix: authorization?.slice(0, 14),
    apiKeyPrefix: apiKey?.slice(0, 14),
    apiKeyLength: apiKey?.length,
  };
}
