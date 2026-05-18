type SupabaseErrorLike = {
  message?: string;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
  status?: number;
  statusText?: string;
  name?: string;
};

export type SupabaseErrorExtraction = {
  message?: string;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
  table?: string | null;
  column?: string | null;
  relation?: string | null;
  raw: unknown;
};

export function logSupabaseQueryError(
  context: string,
  query: string,
  error: unknown,
) {
  const payload = normalizeSupabaseError(error);

  console.error(`[supabase:${context}] query failed`, {
    query,
    ...payload,
  });
}

export function logSupabaseQueryException(
  context: string,
  query: string,
  error: unknown,
) {
  console.error(`[supabase:${context}] query exception`, {
    query,
    error: error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
          cause: error.cause,
        }
      : error,
  });
}

export function normalizeSupabaseError(error: unknown): SupabaseErrorExtraction {
  if (!error || typeof error !== "object") {
    return {
      message: String(error),
      details: null,
      hint: null,
      code: null,
      table: null,
      column: null,
      relation: null,
      raw: error,
    };
  }

  const value = error as SupabaseErrorLike;
  const rawDescription = describeUnknownError(error);
  const joined = [value.message, value.details, value.hint, value.code, rawDescription].filter(Boolean).join(" ");
  const columnRef = extractColumnRef(joined);

  return {
    message: value.message ?? value.statusText ?? value.name ?? rawDescription,
    details: value.details,
    hint: value.hint,
    code: value.code,
    table: columnRef?.table ?? extractNamedMatch(joined, /(?:table|relation|from)\s+"?([a-zA-Z0-9_]+)"?/i),
    column: columnRef?.column ?? extractNamedMatch(joined, /(?:column|selecting|field)\s+"?([a-zA-Z0-9_]+)"?/i),
    relation: extractNamedMatch(joined, /relationship between '([^']+)'/i) ?? extractNamedMatch(joined, /relation\s+"?([a-zA-Z0-9_.]+)"?/i),
    raw: error,
  };
}

function describeUnknownError(error: unknown) {
  if (error instanceof Error) return error.message;

  try {
    const serialized = JSON.stringify(error);
    if (serialized && serialized !== "{}") return serialized;
  } catch {
    return String(error);
  }

  if (error && typeof error === "object") {
    const keys = Object.keys(error);
    return keys.length > 0 ? `Object with keys: ${keys.join(", ")}` : "Empty error object";
  }

  return String(error);
}

function extractNamedMatch(value: string, pattern: RegExp) {
  return pattern.exec(value)?.[1] ?? null;
}

function extractColumnRef(value: string) {
  const match = /column\s+([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s+does not exist/i.exec(value);
  if (!match) return null;

  return {
    table: match[1],
    column: match[2],
  };
}
